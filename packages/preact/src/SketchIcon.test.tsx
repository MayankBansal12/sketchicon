// @vitest-environment jsdom
/** @jsxImportSource preact */
import { createRef, h, hydrate, render } from "preact";
import { act } from "preact/test-utils";
import { renderToString } from "preact-render-to-string";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderSketch, type SketchGeometry } from "@sketchicon/core";
import { SketchIcon } from "./SketchIcon.js";

const geometry: SketchGeometry = {
  viewBox: "0 0 32 32",
  primitives: [{ type: "line", x1: 2, y1: 12, x2: 22, y2: 12 }],
};
const container = document.createElement("div");
afterEach(() => { render(null, container); container.replaceChildren(); });

describe("Preact SketchIcon", () => {
  it("hydrates the existing SVG, forwards its ref, and handles native events", () => {
    const ref = createRef<SVGSVGElement>();
    const onClick = vi.fn();
    const props = { icon: geometry, title: "Divider", svgRef: ref, onClick };
    container.innerHTML = renderToString(h(SketchIcon, props));
    const original = container.firstElementChild;
    act(() => hydrate(h(SketchIcon, props), container));
    expect(ref.current).toBe(original);
    original!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
    act(() => render(h(SketchIcon, { ...props, size: 40, roughness: 0, title: undefined }), container));
    expect(ref.current).toBe(original);
    expect(original!.getAttribute("width")).toBe("40");
    expect(original!.getAttribute("aria-hidden")).toBe("true");
    expect(original!.querySelector("title")).toBeNull();
    expect(original!.querySelectorAll("path")).toHaveLength(1);
    act(() => render(null, container));
    expect(ref.current).toBeNull();
  });

  it("normalizes SVG aliases locally and preserves native overrides", () => {
    const props = { icon: geometry, strokeWidth: 3, strokeLinecap: "square" as const,
      strokeLinejoin: "bevel" as const, fillOpacity: 0.5, vectorEffect: "non-scaling-stroke",
      preserveAspectRatio: "xMinYMin", viewBox: "0 0 48 48" };
    const server = document.createElement("div");
    server.innerHTML = renderToString(h(SketchIcon, props));
    act(() => render(h(SketchIcon, props), container));
    for (const svg of [server.querySelector("svg")!, container.querySelector("svg")!]) {
      expect(svg.getAttribute("stroke-width")).toBe("3");
      expect(svg.getAttribute("stroke-linecap")).toBe("square");
      expect(svg.getAttribute("stroke-linejoin")).toBe("bevel");
      expect(svg.getAttribute("fill-opacity")).toBe("0.5");
      expect(svg.getAttribute("vector-effect")).toBe("non-scaling-stroke");
      expect(svg.getAttribute("viewBox")).toBe("0 0 48 48");
      expect(svg.getAttribute("preserveAspectRatio")).toBe("xMinYMin");
      expect(svg.hasAttribute("strokeWidth")).toBe(false);
    }
    act(() => render(h(SketchIcon, { ...props, strokeWidth: 5, "stroke-linecap": "butt" }), container));
    expect(container.querySelector("svg")!.getAttribute("stroke-width")).toBe("5");
    expect(container.querySelector("svg")!.getAttribute("stroke-linecap")).toBe("butt");
  });

  it("preserves native Preact events on unrelated elements", () => {
    const onChange = vi.fn();
    act(() => render(<input onChange={onChange} />, container));
    const input = container.querySelector("input")!;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it.each([{ roughness: 0 }, { roughness: 0.8 }, { seed: 7 }])(
    "invalidates mutated custom geometry with options %o", options => {
      const line = { type: "line" as const, x1: 0, y1: 0, x2: 10, y2: 10 };
      const icon = { primitives: [line] };
      act(() => render(<SketchIcon icon={icon} {...options} />, container));
      const first = container.innerHTML;
      line.x2 = 20;
      act(() => render(<SketchIcon icon={icon} {...options} />, container));
      expect(container.innerHTML).not.toBe(first);
      expect(Array.from(container.querySelectorAll("path"), p => p.getAttribute("d")))
        .toEqual(renderSketch(icon, options).map(p => p.d));
    },
  );

  it("updates when custom geometry is mutated or seed changes", () => {
    const line = { type: "line" as const, x1: 0, y1: 0, x2: 10, y2: 10 };
    const icon = { primitives: [line] };
    act(() => render(<SketchIcon icon={icon} />, container));
    const first = container.innerHTML;
    line.x2 = 20;
    act(() => render(<SketchIcon icon={icon} />, container));
    expect(container.innerHTML).not.toBe(first);
    act(() => render(<SketchIcon icon={icon} seed={42} aria-label="Line" />, container));
    const paths = Array.from(container.querySelectorAll("path"), p => p.getAttribute("d"));
    expect(paths).toEqual(renderSketch(icon, { seed: 42 }).map(p => p.d));
    expect(container.querySelector("svg")!.hasAttribute("aria-hidden")).toBe(false);
  });
});
