import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Search } from "@sketchicon/lucide";
import SearchDirect from "@sketchicon/lucide/icons/search";
import { Home01Icon } from "@sketchicon/hugeicons";
import Home01Direct from "@sketchicon/hugeicons/icons/home-01";
import { SketchIcon } from "sketchicon";
import { renderSketch } from "sketchicon/core";

describe("SketchIcon packages", () => {
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

  it("defaults roughness to 1.5", () => {
    const implicit = renderToStaticMarkup(createElement(SketchIcon, { icon: Search }));
    const explicit = renderToStaticMarkup(
      createElement(SketchIcon, { icon: Search, roughness: 1.5 }),
    );

    expect(implicit).toBe(explicit);
  });

  it("supports the public core and per-icon subpaths", () => {
    expect(SearchDirect).toEqual(Search);
    expect(renderSketch(Search)).not.toHaveLength(0);
  });

  it("exports provider-scoped Hugeicons geometry", () => {
    expect(Home01Direct).toEqual(Home01Icon);
    expect(Home01Icon.viewBox).toBe("0 0 24 24");
    expect(renderSketch(Home01Icon)).not.toHaveLength(0);
  });
});
