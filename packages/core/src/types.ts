export interface PathPrimitive {
  type: "path";
  d: string;
}

export interface LinePrimitive {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PolylinePrimitive {
  type: "polyline" | "polygon";
  points: readonly number[];
}

export interface CirclePrimitive {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
}

export interface EllipsePrimitive {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface RectPrimitive {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
}

export type SketchPrimitive =
  | PathPrimitive
  | LinePrimitive
  | PolylinePrimitive
  | CirclePrimitive
  | EllipsePrimitive
  | RectPrimitive;

export interface SketchGeometry {
  primitives: readonly SketchPrimitive[];
  viewBox?: string;
}

export interface SketchOptions {
  roughness?: number;
  seed?: number;
}

export interface SketchPath {
  d: string;
  opacity?: number;
}
