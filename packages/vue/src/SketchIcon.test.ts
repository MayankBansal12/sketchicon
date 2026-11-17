// @vitest-environment happy-dom

import { createSSRApp, h, nextTick, reactive } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";

import { SketchIcon } from "./index.js";

const line = {
  primitives: [{ type: "line" as const, x1: 2, y1: 3, x2: 20, y2: 21 }],
};

describe("Vue SketchIcon", () => {
  it("renders deterministic SSR markup with React-equivalent accessibility defaults", async () => {
    const render = () => renderToString(h(SketchIcon, { icon: line }));
    const first = await render();
    expect(await render()).toBe(first);
    expect(first).toContain("<svg");
    expect(first).toContain('aria-hidden="true"');
    expect(first).toContain('stroke-width="1.5"');
    expect(first).toContain('stroke-linecap="round"');
    expect(first).toContain('stroke-linejoin="round"');
    expect(first).not.toContain("strokeWidth");
    expect(first).not.toContain("strokeLinecap");
    expect(first).not.toContain("strokeLinejoin");
    expect(first).not.toContain('role="img"');

    const labeled = await renderToString(h(SketchIcon, {
      icon: line,
      title: "Line",
      class: "custom",
      "data-test": "forwarded",
    }));
    expect(labeled).toContain("<title>Line</title>");
    expect(labeled).toContain('role="img"');
    expect(labeled).not.toContain("aria-hidden");
    expect(labeled).toContain('class="custom"');
    expect(labeled).toContain('data-test="forwarded"');
  });

  it("hydrates SSR markup, forwards listeners, and reacts to prop changes", async () => {
    const state = reactive({ roughness: 1.5, seed: 0, size: 24 });
    const clicked = vi.fn();
    const container = document.createElement("div");
    const createIconApp = () => createSSRApp({
      setup: () => () => h(SketchIcon, {
        icon: line,
        roughness: state.roughness,
        seed: state.seed,
        size: state.size,
        stroke: "red",
        "aria-label": "Line",
        onClick: clicked,
      }),
    });
    container.innerHTML = await renderToString(createIconApp());
    const serverSvg = container.querySelector("svg");
    const app = createIconApp();
    const warned = vi.fn();
    app.config.warnHandler = warned;
    app.mount(container);

    const svg = container.querySelector("svg");
    expect(svg).toBe(serverSvg);
    expect(warned).not.toHaveBeenCalled();
    expect(svg?.getAttribute("stroke")).toBe("red");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("stroke-width")).toBe("1.5");
    expect(svg?.getAttribute("stroke-linecap")).toBe("round");
    expect(svg?.getAttribute("stroke-linejoin")).toBe("round");
    expect(svg?.getAttribute("strokeWidth")).toBeNull();
    expect(svg?.getAttribute("strokeLinecap")).toBeNull();
    expect(svg?.getAttribute("strokeLinejoin")).toBeNull();
    const originalPath = svg?.querySelector("path")?.getAttribute("d");
    svg?.dispatchEvent(new MouseEvent("click"));
    expect(clicked).toHaveBeenCalledOnce();

    state.size = 40;
    state.seed = 7;
    await nextTick();
    expect(svg?.getAttribute("width")).toBe("40");
    expect(svg?.querySelector("path")?.getAttribute("d")).not.toBe(originalPath);
    app.unmount();
  });
});
