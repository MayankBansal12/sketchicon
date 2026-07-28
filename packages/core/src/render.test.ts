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
        d: "M3.756 11.866C5.773 14.073 7.902 16.167 10.145 18.148C13.729 14.512 16.958 10.581 19.832 6.354",
      },
      {
        d: "M3.999 11.893C5.767 14.133 7.731 16.177 9.891 18.024C13.394 14.072 16.768 10.011 20.012 5.844",
        opacity: 0.72,
      },
      {
        d: "M2.235 11.999C1.924 7.013 6.687 2.045 12.163 2.139C17.912 2.315 22.068 6.862 22.177 12.16C21.993 16.935 17.704 22.089 11.95 21.983C6.25 22.376 1.724 18.103 2.298 12.236z",
      },
      {
        d: "M2.214 11.967C2.098 6.387 6.275 2.085 11.807 2.072C17.199 1.836 22.245 6.055 21.855 11.933C22.41 17.447 17.359 21.943 11.84 22.159C6.1 21.881 1.94 17.527 2.105 12.006z",
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

  it("continues drawing from the subpath start after closing a path", () => {
    const closedPath: SketchGeometry = {
      primitives: [{ type: "path", d: "m19 8 3 8a5 5 0 0 1-6 0zV7" }],
    };

    expect(renderSketch(closedPath)).toEqual([
      {
        d: "M18.716 7.927C19.781 10.619 20.959 13.268 22.25 15.875C19.931 17.834 17.957 17.005 16.148 15.984zC18.848 7.725 18.976 7.522 19.1 7.319",
      },
      {
        d: "M19.127 8.01C20.086 10.759 21.09 13.491 22.137 16.207C20.232 17.468 18.102 17.228 15.959 16.04zC19.092 7.746 19.055 7.482 19.014 7.219",
        opacity: 0.72,
      },
    ]);
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
