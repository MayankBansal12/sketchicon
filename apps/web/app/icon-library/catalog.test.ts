import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { iconCatalog } from "../generated/catalog";
import { catalogLoaders } from "../generated/loaders";
import IconLibrary from "./IconLibrary";
import { filterCatalog, filterCounts } from "./catalog";

describe("generated website catalog", () => {
  it("contains unique searchable metadata for every compatible icon", () => {
    expect(iconCatalog).toHaveLength(1739);
    expect(new Set(iconCatalog.map((icon) => icon.name)).size).toBe(iconCatalog.length);
    expect(new Set(iconCatalog.map((icon) => icon.label)).size).toBe(iconCatalog.length);
    expect(iconCatalog.every((icon) => icon.searchText === icon.searchText.toLowerCase())).toBe(true);
  });

  it("loads every geometry exactly once from coarse chunks", async () => {
    expect(catalogLoaders.length).toBeGreaterThan(1);
    expect(catalogLoaders.length).toBeLessThan(30);

    const chunks = await Promise.all(catalogLoaders.map((loader) => loader()));
    const names = chunks.flatMap((chunk) => Object.keys(chunk));
    expect(names).toHaveLength(iconCatalog.length);
    expect(new Set(names).size).toBe(iconCatalog.length);
    expect(iconCatalog.every((icon) => chunks[icon.chunkId]?.[icon.name])).toBe(true);
  });

  it("renders the first bounded catalog window without loading placeholders", () => {
    const markup = renderToStaticMarkup(createElement(IconLibrary));
    expect(markup.match(/<button class="icon-card"/g)).toHaveLength(48);
    expect(markup).not.toContain("icon-card-loading");
    expect(markup).toContain("height:38860px");
  });
});

describe("catalog filtering", () => {
  it("searches labels, export names, and aliases", () => {
    expect(filterCatalog("search", "all").some((icon) => icon.name === "Search")).toBe(true);
    expect(filterCatalog("AlarmCheck", "all").some((icon) => icon.label === "alarm-clock-check")).toBe(true);
    expect(filterCatalog("arrow left", "all").some((icon) => icon.label === "arrow-left")).toBe(true);
  });

  it("uses stable precomputed filter counts", () => {
    expect(filterCounts.all).toBe(iconCatalog.length);
    expect(filterCatalog("", "files")).toHaveLength(filterCounts.files);
  });
});
