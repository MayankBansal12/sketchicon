import type { SketchGeometry } from "@sketchicon/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  renderSketch: vi.fn(),
  useMemo: vi.fn(),
}));

vi.mock("@sketchicon/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@sketchicon/core")>();
  mocks.renderSketch.mockImplementation(original.renderSketch);
  return { ...original, renderSketch: mocks.renderSketch };
});

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return { ...original, useMemo: mocks.useMemo };
});

import { SketchIcon } from "./SketchIcon.js";

const geometry: SketchGeometry = {
  primitives: [{ type: "line", x1: 2, y1: 12, x2: 22, y2: 12 }],
};

describe("SketchIcon", () => {
  beforeEach(() => {
    mocks.renderSketch.mockClear();
    mocks.useMemo.mockImplementation((factory) => factory());
  });

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

  it("uses roughness 1.5 by default", () => {
    const defaultMarkup = renderToStaticMarkup(createElement(SketchIcon, { icon: geometry }));
    const explicitMarkup = renderToStaticMarkup(
      createElement(SketchIcon, { icon: geometry, roughness: 1.5 }),
    );

    expect(defaultMarkup).toBe(explicitMarkup);
  });

  it("shares default paths between component instances", () => {
    const sharedGeometry: SketchGeometry = { ...geometry };
    const first = renderToStaticMarkup(createElement(SketchIcon, { icon: sharedGeometry }));
    const second = renderToStaticMarkup(createElement(SketchIcon, { icon: sharedGeometry }));

    expect(first).toBe(second);
    expect(mocks.renderSketch).toHaveBeenCalledOnce();
  });

  it("invalidates shared paths when custom geometry is mutated", () => {
    const line = { type: "line" as const, x1: 2, y1: 12, x2: 22, y2: 12 };
    const mutableGeometry: SketchGeometry = { primitives: [line] };
    const first = renderToStaticMarkup(
      createElement(SketchIcon, { icon: mutableGeometry }),
    );

    line.x2 = 12;
    const second = renderToStaticMarkup(
      createElement(SketchIcon, { icon: mutableGeometry }),
    );

    expect(second).not.toBe(first);
    expect(mocks.renderSketch).toHaveBeenCalledTimes(2);
  });

  it("does not share paths for custom geometry options", () => {
    const sharedGeometry: SketchGeometry = { ...geometry };
    renderToStaticMarkup(
      createElement(SketchIcon, { icon: sharedGeometry, roughness: 1 }),
    );
    renderToStaticMarkup(
      createElement(SketchIcon, { icon: sharedGeometry, roughness: 1 }),
    );

    expect(mocks.renderSketch).toHaveBeenCalledTimes(2);
  });

  it("recalculates paths only when rendering inputs change", () => {
    const localGeometry: SketchGeometry = { ...geometry };
    let cachedDependencies: readonly unknown[] | undefined;
    let cachedValue: unknown;
    mocks.useMemo.mockImplementation(
      (factory: () => unknown, dependencies: readonly unknown[]) => {
        if (
          cachedDependencies === undefined ||
          dependencies.some(
            (dependency, index) => !Object.is(dependency, cachedDependencies?.[index]),
          )
        ) {
          cachedValue = factory();
          cachedDependencies = dependencies;
        }
        return cachedValue;
      },
    );

    renderToStaticMarkup(createElement(SketchIcon, { icon: localGeometry }));
    renderToStaticMarkup(
      createElement(SketchIcon, {
        icon: localGeometry,
        size: 32,
        strokeWidth: 1.5,
        color: "red",
        title: "Divider",
        className: "icon",
      }),
    );
    expect(mocks.renderSketch).toHaveBeenCalledTimes(1);

    const line = localGeometry.primitives[0];
    if (!line || line.type !== "line") throw new Error("Expected line geometry.");
    line.x2 = 12;
    renderToStaticMarkup(createElement(SketchIcon, { icon: localGeometry }));
    expect(mocks.renderSketch).toHaveBeenCalledTimes(2);

    const nextGeometry: SketchGeometry = { ...localGeometry };
    renderToStaticMarkup(createElement(SketchIcon, { icon: nextGeometry }));
    renderToStaticMarkup(
      createElement(SketchIcon, { icon: nextGeometry, roughness: 0.5 }),
    );
    renderToStaticMarkup(
      createElement(SketchIcon, { icon: nextGeometry, roughness: 0.5, seed: 1 }),
    );

    expect(mocks.renderSketch).toHaveBeenCalledTimes(5);
  });
});
