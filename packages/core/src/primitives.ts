import type { SketchPrimitive } from "./types.js";

const KAPPA = 0.552_284_749_8;

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;

  return [
    `M${cx - rx} ${cy}`,
    `C${cx - rx} ${cy - oy} ${cx - ox} ${cy - ry} ${cx} ${cy - ry}`,
    `C${cx + ox} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx} ${cy}`,
    `C${cx + rx} ${cy + oy} ${cx + ox} ${cy + ry} ${cx} ${cy + ry}`,
    `C${cx - ox} ${cy + ry} ${cx - rx} ${cy + oy} ${cx - rx} ${cy}Z`,
  ].join("");
}

function pointsPath(points: readonly number[], close: boolean): string {
  if (points.length < 4 || points.length % 2 !== 0) {
    throw new Error("Polyline and polygon points must contain at least two coordinate pairs.");
  }

  let path = `M${points[0]} ${points[1]}`;
  for (let index = 2; index < points.length; index += 2) {
    path += `L${points[index]} ${points[index + 1]}`;
  }
  return close ? `${path}Z` : path;
}

function rectPath(primitive: Extract<SketchPrimitive, { type: "rect" }>): string {
  const { x, y, width, height } = primitive;
  const requestedRx = primitive.rx ?? primitive.ry ?? 0;
  const requestedRy = primitive.ry ?? primitive.rx ?? 0;
  const rx = Math.max(0, Math.min(requestedRx, width / 2));
  const ry = Math.max(0, Math.min(requestedRy, height / 2));

  if (rx === 0 || ry === 0) {
    return `M${x} ${y}H${x + width}V${y + height}H${x}Z`;
  }

  return [
    `M${x + rx} ${y}`,
    `H${x + width - rx}`,
    `Q${x + width} ${y} ${x + width} ${y + ry}`,
    `V${y + height - ry}`,
    `Q${x + width} ${y + height} ${x + width - rx} ${y + height}`,
    `H${x + rx}`,
    `Q${x} ${y + height} ${x} ${y + height - ry}`,
    `V${y + ry}`,
    `Q${x} ${y} ${x + rx} ${y}Z`,
  ].join("");
}

export function primitiveToPath(primitive: SketchPrimitive): string {
  switch (primitive.type) {
    case "path":
      return primitive.d;
    case "line":
      return `M${primitive.x1} ${primitive.y1}L${primitive.x2} ${primitive.y2}`;
    case "polyline":
      return pointsPath(primitive.points, false);
    case "polygon":
      return pointsPath(primitive.points, true);
    case "circle":
      return ellipsePath(primitive.cx, primitive.cy, primitive.r, primitive.r);
    case "ellipse":
      return ellipsePath(primitive.cx, primitive.cy, primitive.rx, primitive.ry);
    case "rect":
      return rectPath(primitive);
  }
}
