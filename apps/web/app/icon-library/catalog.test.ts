import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { lucideCatalog } from "../generated/catalog";
import { hugeiconsCatalog } from "../generated/hugeicons-catalog";
import { catalogLoaders } from "../generated/loaders";
import { iconCount, providerCounts } from "../generated/stats";
import IconLibrary from "./IconLibrary";
import { filterCatalog, formatIconImport, getFilterCounts } from "./catalog";

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

  it("loads every geometry exactly once from coarse chunks", async () => {
    expect(catalogLoaders.length).toBeGreaterThan(1);
    expect(catalogLoaders.length).toBeLessThan(60);

    const chunks = await Promise.all(catalogLoaders.map((loader) => loader()));
    const ids = chunks.flatMap((chunk) => Object.keys(chunk));
    expect(ids).toHaveLength(iconCatalog.length);
    expect(new Set(ids).size).toBe(iconCatalog.length);
    expect(iconCatalog.every((icon) => chunks[icon.chunkId]?.[icon.id])).toBe(true);
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
