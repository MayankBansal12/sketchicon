// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderSketch, type SketchGeometry } from "@sketchicon/core";
import { createSketchIcon, updateSketchIcon } from "./index.js";

const geometry: SketchGeometry = {
  viewBox: "0 0 32 32",
  primitives: [{ type: "line", x1: 2, y1: 12, x2: 22, y2: 12 }],
};

describe("vanilla SVG adapter", () => {
  it.each([0, 0.75, 1.5, 2])("creates deterministic SVG paths at roughness %s", roughness => {
    const options = { roughness, seed: 9, size: 32, strokeWidth: 2 };
    const svg = createSketchIcon(geometry, options);
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 32 32");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("stroke-width")).toBe("2");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.outerHTML).toBe(createSketchIcon(geometry, options).outerHTML);
    expect(Array.from(svg.querySelectorAll("path"), p => ({
      d: p.getAttribute("d"), ...(p.hasAttribute("opacity") ? { opacity: Number(p.getAttribute("opacity")) } : {}),
    }))).toEqual(renderSketch(geometry, options));
  });

  it("escapes title text and honors native SVG and ARIA overrides", () => {
    const svg = createSketchIcon(geometry, {
      title: '<img src=x onerror="bad()"> & Search',
      attributes: { class: "icon", width: "1em", "aria-hidden": false, "data-icon": "search" },
    });
    expect(svg.querySelector("img")).toBeNull();
    expect(svg.querySelector("title")!.textContent).toContain("<img");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-hidden")).toBe("false");
    expect(svg.getAttribute("width")).toBe("1em");
    expect(svg.getAttribute("class")).toBe("icon");
  });

  it("updates in place, preserves listeners, and removes stale options", () => {
    const svg = createSketchIcon(geometry, { title: "Line", color: "red", attributes: { class: "old" } });
    const clicked = vi.fn();
    svg.addEventListener("click", clicked);
    svg.setAttribute("data-owner", "caller");
    const firstPath = svg.querySelector("path")!.getAttribute("d");
    expect(updateSketchIcon(svg, geometry, { size: 48, roughness: 0 })).toBe(svg);
    svg.dispatchEvent(new MouseEvent("click"));
    expect(clicked).toHaveBeenCalledOnce();
    expect(svg.getAttribute("data-owner")).toBe("caller");
    expect(svg.getAttribute("width")).toBe("48");
    expect(svg.hasAttribute("color")).toBe(false);
    expect(svg.hasAttribute("class")).toBe(false);
    expect(svg.hasAttribute("role")).toBe(false);
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.querySelector("title")).toBeNull();
    expect(svg.querySelector("path")!.getAttribute("d")).not.toBe(firstPath);
    updateSketchIcon(svg, geometry, { attributes: { "aria-label": "Line" } });
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.hasAttribute("aria-hidden")).toBe(false);
    updateSketchIcon(svg, geometry);
    expect(svg.hasAttribute("aria-label")).toBe(false);
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("width")).toBe("24");
  });

  it("uses the element's owner document and leaves it intact on invalid input", () => {
    const other = document.implementation.createHTMLDocument();
    const svg = createSketchIcon(geometry, {}, other);
    expect(svg.ownerDocument).toBe(other);
    const before = svg.outerHTML;
    expect(() => updateSketchIcon(svg, geometry, { roughness: NaN })).toThrow();
    expect(svg.outerHTML).toBe(before);
    expect(() => updateSketchIcon(svg, geometry, { attributes: { "invalid name": "x" } })).toThrow();
    expect(svg.outerHTML).toBe(before);
    updateSketchIcon(svg, geometry, { title: "Updated" });
    expect(svg.querySelector("title")!.ownerDocument).toBe(other);
  });
});
