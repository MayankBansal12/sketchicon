import { beforeEach, describe, expect, it, vi } from "vitest";

const counters = vi.hoisted(() => ({ constructions: 0 }));

vi.mock("svg-pathdata", async (importOriginal) => {
  const original = await importOriginal<typeof import("svg-pathdata")>();

  class CountingSVGPathData extends original.SVGPathData {
    constructor(...args: ConstructorParameters<typeof original.SVGPathData>) {
      super(...args);
      counters.constructions += 1;
    }
  }

  return { ...original, SVGPathData: CountingSVGPathData };
});

import { renderSketch, type SketchGeometry } from "./index.js";

describe("renderSketch parsing work", () => {
  beforeEach(() => {
    counters.constructions = 0;
  });

  it("parses unchanged primitives once across roughness and seed variants", () => {
    const geometry: SketchGeometry = {
      primitives: [{ type: "path", d: "M2 12L22 12" }],
    };

    renderSketch(geometry, { roughness: 0.5, seed: 1 });
    expect(counters.constructions).toBe(3);

    renderSketch(geometry, { roughness: 1.8, seed: 99 });
    expect(counters.constructions).toBe(5);
  });

  it("reuses clean normalization and invalidates it after mutation", () => {
    const line = { type: "line" as const, x1: 2, y1: 12, x2: 22, y2: 12 };
    const geometry: SketchGeometry = { primitives: [line] };

    renderSketch(geometry, { roughness: 0 });
    renderSketch(geometry, { roughness: 0 });
    expect(counters.constructions).toBe(1);

    line.x2 = 12;
    renderSketch(geometry, { roughness: 0 });
    expect(counters.constructions).toBe(2);
  });
});
