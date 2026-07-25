import type { SketchGeometry } from "@sketchicon/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SketchIcon } from "./index.js";

const geometry: SketchGeometry = {
  primitives: [{ type: "line", x1: 2, y1: 12, x2: 22, y2: 12 }],
};

describe("SketchIcon", () => {
  it("renders accessible deterministic SVG", () => {
    const props = { icon: geometry, title: "Divider", roughness: 1, seed: 4 };
    const first = renderToStaticMarkup(createElement(SketchIcon, props));
    const second = renderToStaticMarkup(createElement(SketchIcon, props));

    expect(first).toBe(second);
    expect(first).toContain("<title>Divider</title>");
    expect(first).toContain('role="img"');
    expect(first).not.toContain("aria-hidden");
  });

  it("hides unlabeled decorative icons", () => {
    const markup = renderToStaticMarkup(createElement(SketchIcon, { icon: geometry }));

    expect(markup).toContain('aria-hidden="true"');
  });

  it("uses roughness 1 by default", () => {
    const defaultMarkup = renderToStaticMarkup(createElement(SketchIcon, { icon: geometry }));
    const explicitMarkup = renderToStaticMarkup(
      createElement(SketchIcon, { icon: geometry, roughness: 1 }),
    );

    expect(defaultMarkup).toBe(explicitMarkup);
  });
});
