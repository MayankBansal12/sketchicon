import { describe, expect, it } from "vitest";

import { primitiveToPath, renderSketch, type SketchGeometry } from "./index.js";

const geometry: SketchGeometry = {
  viewBox: "0 0 24 24",
  primitives: [
    { type: "path", d: "M4 12L10 18L20 6" },
    { type: "circle", cx: 12, cy: 12, r: 10 },
  ],
};

describe("renderSketch", () => {
  it("returns deterministic double strokes", () => {
    const first = renderSketch(geometry);
    const second = renderSketch(geometry);

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first[1]?.opacity).toBe(0.72);
  });

  it("preserves the exact normalized sketch output", () => {
    expect(renderSketch(geometry)).toEqual([
      {
        d: "M3.837 11.911C5.811 14.086 7.897 16.149 10.097 18.098C13.597 14.341 16.861 10.387 19.888 6.236",
      },
      {
        d: "M3.999 11.929C5.834 14.099 7.81 16.129 9.927 18.016C13.374 14.048 16.734 10.008 20.008 5.896",
        opacity: 0.72,
      },
      {
        d: "M2.156 11.999C1.95 6.834 6.617 2.03 12.109 2.093C17.782 2.21 22.045 6.734 22.118 12.107C21.995 17.131 17.643 22.059 11.966 21.988C6.326 22.251 1.816 17.91 2.198 12.157z",
      },
      {
        d: "M2.142 11.978C2.065 6.417 6.342 2.057 11.871 2.048C17.307 1.891 22.163 6.196 21.904 11.955C22.273 17.472 17.414 21.962 11.893 22.106C6.225 21.921 1.96 17.525 2.07 12.004z",
        opacity: 0.72,
      },
    ]);
  });

  it("changes output when the seed changes", () => {
    expect(renderSketch(geometry, { seed: 1 })).not.toEqual(
      renderSketch(geometry, { seed: 2 }),
    );
  });

  it("preserves subtle roughness and seed variations", () => {
    const subtle = renderSketch(geometry, { roughness: 0.1, seed: 1 });

    expect(subtle).not.toEqual(
      renderSketch(geometry, { roughness: 0.2, seed: 1 }),
    );
    expect(subtle).not.toEqual(
      renderSketch(geometry, { roughness: 0.1, seed: 2 }),
    );
  });

  it("returns one clean path per primitive at zero roughness", () => {
    const paths = renderSketch(geometry, { roughness: 0 });

    expect(paths).toHaveLength(2);
    expect(paths.every((path) => path.opacity === undefined)).toBe(true);
  });

  it("clamps roughness to the public range", () => {
    expect(renderSketch(geometry, { roughness: 3 })).toEqual(
      renderSketch(geometry, { roughness: 2 }),
    );
    expect(renderSketch(geometry, { roughness: -1 })).toEqual(
      renderSketch(geometry, { roughness: 0 }),
    );
  });

  it("rejects invalid numeric options", () => {
    expect(() => renderSketch(geometry, { roughness: Number.NaN })).toThrow(
      "Roughness must be a finite number.",
    );
    expect(() => renderSketch(geometry, { seed: Number.POSITIVE_INFINITY })).toThrow(
      "Seed must be a finite number.",
    );
  });
});

describe("primitiveToPath", () => {
  it("validates point lists", () => {
    expect(() => primitiveToPath({ type: "polyline", points: [1, 2, 3] })).toThrow(
      "coordinate pairs",
    );
  });

  it("converts every supported primitive", () => {
    const paths = [
      primitiveToPath({ type: "line", x1: 0, y1: 1, x2: 2, y2: 3 }),
      primitiveToPath({ type: "polygon", points: [0, 0, 1, 1] }),
      primitiveToPath({ type: "ellipse", cx: 5, cy: 5, rx: 3, ry: 2 }),
      primitiveToPath({ type: "rect", x: 0, y: 0, width: 4, height: 5, rx: 1 }),
    ];

    expect(paths.every((path) => path.startsWith("M"))).toBe(true);
  });
});
