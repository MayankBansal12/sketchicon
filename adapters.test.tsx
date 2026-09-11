// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { SketchIcon as ReactIcon } from "./packages/runtime/src/ServerSketchIcon.js";
import { SketchIcon as PreactIcon } from "./packages/preact/src/SketchIcon.js";
import { createSketchIcon } from "./packages/dom/src/index.js";

function shape(markup: string) {
  const root = document.createElement("div");
  root.innerHTML = markup;
  const svg = root.querySelector("svg")!;
  return {
    attributes: Object.fromEntries(Array.from(svg.attributes, a => [a.name, a.value])),
    content: svg.innerHTML,
  };
}

describe("cross-framework rendering", () => {
  it.each([0, 0.75, 1.5, 2])("matches SVG geometry and accessibility at roughness %s", roughness => {
    const icon = { viewBox: "0 0 32 32", primitives: [{ type: "line" as const, x1: 2, y1: 12, x2: 22, y2: 12 }] };
    for (const title of [undefined, "Divider < & >"]) {
      const props = { icon, title, size: 32, roughness, seed: 7 };
      const expected = shape(renderToStaticMarkup(createElement(ReactIcon, props)));
      expect(shape(renderToString(h(PreactIcon, props)))).toEqual(expected);
      expect(shape(createSketchIcon(icon, props).outerHTML)).toEqual(expected);
    }
  });
});
