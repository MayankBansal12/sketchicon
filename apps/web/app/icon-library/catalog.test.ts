import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { gzipSync } from "node:zlib";

import { lucideCatalog } from "../generated/catalog";
import { hugeiconsCatalog } from "../generated/hugeicons-catalog";
import {
  catalogLoaders,
  initialGeometries,
} from "../generated/loaders";
import { iconCount, providerCounts } from "../generated/stats";
import IconLibrary, {
  CatalogLoadError,
  loadCatalogGeometryBatch,
  loadHugeiconsMetadata,
} from "./IconLibrary";
import { filterCatalog, filters, formatIconImport, getFilterCounts } from "./catalog";

const iconCatalog = [...lucideCatalog, ...hugeiconsCatalog];

describe("generated website catalog", () => {
  it("contains unique searchable metadata for every compatible icon", () => {
    expect(iconCatalog).toHaveLength(iconCount);
    expect(providerCounts).toEqual({ lucide: 1739, hugeicons: 5303 });
    expect(new Set(iconCatalog.map((icon) => icon.id)).size).toBe(iconCatalog.length);
    expect(iconCatalog.every((icon) => icon.searchText === icon.searchText.toLowerCase())).toBe(true);
    expect(hugeiconsCatalog.some((icon) => icon.name === "Bedug02Icon")).toBe(false);
    expect(hugeiconsCatalog.some((icon) => icon.name === "Menu10Icon")).toBe(false);
  });

  it("loads every geometry exactly once from provider-isolated byte-bounded chunks", async () => {
    expect(catalogLoaders.length).toBeGreaterThan(1);
    expect(catalogLoaders.length).toBeLessThan(60);

    const chunks = await Promise.all(catalogLoaders.map((loader) => loader()));
    const chunkProviders = chunks.map((chunk) => Object.keys(chunk)[0]?.split(":")[0]);
    const ids = chunks.flatMap((chunk) => Object.keys(chunk));
    expect(ids).toHaveLength(iconCatalog.length);
    expect(new Set(ids).size).toBe(iconCatalog.length);
    expect(iconCatalog.every((icon) => chunks[icon.chunkId]?.[icon.id])).toBe(true);

    chunks.forEach((chunk, chunkId) => {
      const provider = chunkProviders[chunkId];
      expect(provider === "lucide" || provider === "hugeicons").toBe(true);
      expect(Object.keys(chunk).every((id) => id.startsWith(`${provider}:`))).toBe(true);
      if (chunkId > 0) {
        const payloadBytes = Object.entries(chunk).reduce(
          (bytes, [id, geometry]) => bytes + Buffer.byteLength(`${JSON.stringify(id)}:${JSON.stringify(geometry)}`),
          0,
        );
        expect(payloadBytes).toBeLessThanOrEqual(provider === "lucide" ? 48_000 : 120_000);
      }
    });

    expect(chunkProviders[0]).toBe("lucide");
    expect(Object.keys(initialGeometries).every((id) => id.startsWith("lucide:"))).toBe(true);
    expect(chunkProviders.indexOf("hugeicons")).toBeGreaterThan(0);
  });

  it("keeps realistic Lucide filter and search viewports within transfer budgets", async () => {
    const chunks = await Promise.all(catalogLoaders.map((loader) => loader()));
    const gzipBytes = chunks.map((chunk) => gzipSync(JSON.stringify(chunk)).byteLength);
    const scenarios = [
      ...filters.filter((filter) => filter.id !== "all").map((filter) => ({
        icons: filterCatalog(lucideCatalog, "", filter.id, "lucide"),
        label: `filter:${filter.id}`,
      })),
      ...["arrow", "camera", "home", "search", "user"].map((query) => ({
        icons: filterCatalog(lucideCatalog, query, "all", "lucide"),
        label: `search:${query}`,
      })),
    ];

    for (const { icons, label } of scenarios) {
      const chunkIds = [...new Set(icons.slice(0, 48).map((icon) => icon.chunkId))]
        .filter((chunkId) => chunkId !== 0);
      const transferBytes = chunkIds.reduce((bytes, chunkId) => {
        const chunkBytes = gzipBytes[chunkId];
        expect(chunkBytes, `${label}:chunk-${chunkId}`).toBeDefined();
        return bytes + (chunkBytes ?? 0);
      }, 0);
      expect(chunkIds.length, label).toBeLessThanOrEqual(11);
      expect(transferBytes, label).toBeLessThanOrEqual(90_000);
      expect(chunkIds.every((chunkId) => Object.keys(chunks[chunkId] ?? {})
        .every((id) => id.startsWith("lucide:"))), label).toBe(true);
    }
  });

  it("starts a visible geometry batch concurrently and publishes chunks as they resolve", async () => {
    const started: number[] = [];
    const published: number[] = [];
    let releaseSlowChunk!: () => void;
    const slowChunk = new Promise<void>((resolve) => {
      releaseSlowChunk = resolve;
    });
    const batchPromise = loadCatalogGeometryBatch(
      [1, 2, 3],
      (chunkId) => published.push(chunkId),
      async (chunkId) => {
        started.push(chunkId);
        if (chunkId === 2) await slowChunk;
        if (chunkId === 3) throw new Error("temporary chunk failure");
        return { [`lucide:test-${chunkId}`]: { primitives: [{ type: "circle", cx: 12, cy: 12, r: chunkId }] } };
      },
    );

    expect(started).toEqual([1, 2, 3]);
    await Promise.resolve();
    expect(published).toEqual([1]);
    releaseSlowChunk();
    await expect(batchPromise).resolves.toEqual({
      chunkIds: [1, 2],
      failed: true,
    });
    expect(published).toEqual([1, 2]);
  });

  it("renders the first bounded catalog window without loading placeholders", () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(IconLibrary)),
    );
    expect(markup.match(/<button class="icon-card"/g)).toHaveLength(48);
    expect(markup).not.toContain("icon-card-loading");
    expect(markup).toContain(`height:${Math.ceil(lucideCatalog.length / 6) * 134}px`);
    expect(markup).toContain("Hugeicons");
  });

  it("surfaces Hugeicons metadata failures with an actionable retry", async () => {
    let attempts = 0;
    const importer = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary metadata failure");
      return { hugeiconsCatalog };
    };

    await expect(loadHugeiconsMetadata(importer)).rejects.toThrow("temporary metadata failure");
    await expect(loadHugeiconsMetadata(importer)).resolves.toBe(hugeiconsCatalog);
    expect(attempts).toBe(2);

    const markup = renderToStaticMarkup(createElement(CatalogLoadError, {
      message: "Hugeicons metadata could not be loaded. Check your connection and try again.",
      onRetry: () => undefined,
      retryLabel: "Retry Hugeicons",
    }));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Hugeicons metadata could not be loaded");
    expect(markup).toContain("Retry Hugeicons");
  });
});

describe("catalog filtering", () => {
  it("formats named imports for both providers", () => {
    expect(formatIconImport({ name: "Search", provider: "lucide" }))
      .toBe('import { Search } from "@sketchicon/lucide";');
    expect(formatIconImport({ name: "Search01Icon", provider: "hugeicons" }))
      .toBe('import { Search01Icon } from "@sketchicon/hugeicons";');
  });

  it("searches labels, export names, and aliases", () => {
    expect(filterCatalog(iconCatalog, "search", "all").some((icon) => icon.name === "Search")).toBe(true);
    expect(filterCatalog(iconCatalog, "AlarmCheck", "all").some((icon) => icon.label === "alarm-clock-check")).toBe(true);
    expect(filterCatalog(iconCatalog, "arrow left", "all").some((icon) => icon.label === "arrow-left")).toBe(true);
    expect(filterCatalog(iconCatalog, "home 01", "all", "hugeicons").some((icon) => icon.name === "Home01Icon")).toBe(true);
    expect(filterCatalog(iconCatalog, "", "all", "lucide").every((icon) => icon.provider === "lucide")).toBe(true);
  });

  it("uses stable precomputed filter counts", () => {
    const filterCounts = getFilterCounts(iconCatalog, "all");
    expect(filterCounts.all).toBe(iconCatalog.length);
    expect(filterCatalog(iconCatalog, "", "files")).toHaveLength(filterCounts.files);
  });
});
