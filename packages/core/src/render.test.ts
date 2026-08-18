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

  it("preserves exact output across cached roughness and seed variants", () => {
    renderSketch(geometry, { roughness: 1.8, seed: -42 });

    expect(renderSketch(geometry, { roughness: 0.35, seed: 17 })).toEqual([
      {
        d: "M4.04 11.967C6.09 13.905 8.085 15.897 10.025 17.944C13.294 13.946 16.612 9.99 19.98 6.075",
      },
      {
        d: "M4.055 12.023C6 14.086 8.002 16.091 10.063 18.038C13.351 13.975 16.683 9.948 20.058 5.959",
        opacity: 0.72,
      },
      {
        d: "M1.916 12.003C2.002 6.405 6.37 2.102 12.02 2.049C17.517 1.974 21.924 6.382 22.012 11.978C22.035 17.475 17.588 22.108 11.966 22.047C6.535 22.064 2.077 17.6 1.964 12.007z",
      },
      {
        d: "M1.988 12.05C1.942 6.385 6.441 1.933 11.994 2.027C17.607 1.948 21.971 6.445 21.984 11.955C21.96 17.619 17.507 22.006 12.017 22.05C6.422 21.951 2.072 17.604 2.041 12.023z",
        opacity: 0.72,
      },
    ]);
  });

  it("returns one clean path per primitive at zero roughness", () => {
    const paths = renderSketch(geometry, { roughness: 0 });

    expect(paths).toEqual([
      { d: "M4 12L10 18L20 6" },
      {
        d: "M2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12z",
      },
    ]);
  });

  it("invalidates compiled commands when custom geometry is mutated", () => {
    const primitive = { type: "path" as const, d: "M2 12L22 12" };
    const mutableGeometry: SketchGeometry = { primitives: [primitive] };
    const options = { roughness: 0.8, seed: 12 };
    const before = renderSketch(mutableGeometry, options);

    primitive.d = "M2 2L22 22";
    const after = renderSketch(mutableGeometry, options);
    const fresh = renderSketch(
      { primitives: [{ type: "path", d: primitive.d }] },
      options,
    );

    expect(after).not.toEqual(before);
    expect(after).toEqual(fresh);
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
