import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Search, SketchIcon } from "sketchicon";
import { renderSketch } from "sketchicon/core";
import SearchDirect from "sketchicon/icons/search";

describe("sketchicon package", () => {
  it("exports icon geometry for the universal renderer", () => {
    expect(Search.viewBox).toBe("0 0 24 24");
    expect(Search.primitives.length).toBeGreaterThan(0);

    const markup = renderToStaticMarkup(
      createElement(SketchIcon, { icon: Search, title: "Search" }),
    );

    expect(markup).toContain("<svg");
    expect(markup).toContain("<title>Search</title>");
    expect(markup).not.toMatch(/NaN|Infinity/);
  });

  it("defaults roughness to 1", () => {
    const implicit = renderToStaticMarkup(createElement(SketchIcon, { icon: Search }));
    const explicit = renderToStaticMarkup(
      createElement(SketchIcon, { icon: Search, roughness: 1 }),
    );

    expect(implicit).toBe(explicit);
  });

  it("supports the public core and per-icon subpaths", () => {
    expect(SearchDirect).toEqual(Search);
    expect(renderSketch(Search)).not.toHaveLength(0);
  });
});
