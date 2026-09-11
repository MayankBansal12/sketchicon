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
    const props = { icon: geometry, title: "Divider", ref, onClick };
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
