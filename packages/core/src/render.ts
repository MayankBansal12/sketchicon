import { SVGPathData, type SVGCommand } from "svg-pathdata";

import { primitiveToPath } from "./primitives.js";
import { createRandom, hashString } from "./random.js";
import type { SketchGeometry, SketchOptions, SketchPath } from "./types.js";

const DEFAULT_ROUGHNESS = 1;
const DEFAULT_SEED = 0;
const BASE_DISPLACEMENT = 0.4;
const PATH_PRECISION = 1000;

interface Point {
  x: number;
  y: number;
}

function clampRoughness(value: number | undefined): number {
  if (value === undefined) return DEFAULT_ROUGHNESS;
  if (!Number.isFinite(value)) throw new Error("Roughness must be a finite number.");
  return Math.min(2, Math.max(0, value));
}

function normalizeSeed(value: number | undefined): number {
  if (value === undefined) return DEFAULT_SEED;
  if (!Number.isFinite(value)) throw new Error("Seed must be a finite number.");
  return Math.trunc(value);
}

function randomOffset(random: () => number, amount: number): number {
  return (random() * 2 - 1) * amount;
}

function jitterPoint(point: Point, random: () => number, amount: number): Point {
  return {
    x: point.x + randomOffset(random, amount),
    y: point.y + randomOffset(random, amount),
  };
}

function normalizedCommands(path: string): SVGCommand[] {
  return new SVGPathData(path)
    .toAbs()
    .normalizeHVZ(false, true, true)
    .normalizeST()
    .qtToC()
    .aToC().commands;
}

function sketchPass(commands: readonly SVGCommand[], roughness: number, seed: number): string {
  const random = createRandom(seed);
  const amount = BASE_DISPLACEMENT * roughness;
  const output: SVGCommand[] = [];
  let sourceCurrent: Point = { x: 0, y: 0 };
  let outputCurrent: Point = { x: 0, y: 0 };
  let outputStart: Point = { x: 0, y: 0 };

  for (const command of commands) {
    switch (command.type) {
      case SVGPathData.MOVE_TO: {
        const point = jitterPoint(command, random, amount * 0.65);
        output.push({ type: SVGPathData.MOVE_TO, relative: false, ...point });
        sourceCurrent = { x: command.x, y: command.y };
        outputCurrent = point;
        outputStart = point;
        break;
      }
      case SVGPathData.LINE_TO: {
        const dx = command.x - sourceCurrent.x;
        const dy = command.y - sourceCurrent.y;
        const length = Math.hypot(dx, dy);
        const end = length < 0.5
          ? { x: outputCurrent.x + dx, y: outputCurrent.y + dy }
          : jitterPoint(command, random, amount * 0.65);
        const bend = randomOffset(random, Math.min(amount * 0.85, length * 0.04));
        const normalX = length === 0 ? 0 : -dy / length;
        const normalY = length === 0 ? 0 : dx / length;

        output.push({
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: outputCurrent.x + (end.x - outputCurrent.x) / 3 + normalX * bend,
          y1: outputCurrent.y + (end.y - outputCurrent.y) / 3 + normalY * bend,
          x2: outputCurrent.x + ((end.x - outputCurrent.x) * 2) / 3 + normalX * bend,
          y2: outputCurrent.y + ((end.y - outputCurrent.y) * 2) / 3 + normalY * bend,
          ...end,
        });
        sourceCurrent = { x: command.x, y: command.y };
        outputCurrent = end;
        break;
      }
      case SVGPathData.CURVE_TO: {
        const end = jitterPoint(command, random, amount * 0.5);
        const firstControl = jitterPoint({ x: command.x1, y: command.y1 }, random, amount);
        const secondControl = jitterPoint({ x: command.x2, y: command.y2 }, random, amount);
        output.push({
          type: SVGPathData.CURVE_TO,
          relative: false,
          x1: firstControl.x,
          y1: firstControl.y,
          x2: secondControl.x,
          y2: secondControl.y,
          ...end,
        });
        sourceCurrent = { x: command.x, y: command.y };
        outputCurrent = end;
        break;
      }
      case SVGPathData.CLOSE_PATH:
        output.push(command);
        outputCurrent = outputStart;
        break;
      default:
        throw new Error(`Unsupported normalized SVG command: ${command.type}`);
    }
  }

  return new SVGPathData(output).round(PATH_PRECISION).encode();
}

export function renderSketch(
  geometry: SketchGeometry,
  options: SketchOptions = {},
): SketchPath[] {
  const roughness = clampRoughness(options.roughness);
  const seed = normalizeSeed(options.seed);
  const output: SketchPath[] = [];

  geometry.primitives.forEach((primitive, index) => {
    const path = primitiveToPath(primitive);
    const normalized = new SVGPathData(path).toAbs().round(PATH_PRECISION).encode();

    if (roughness === 0) {
      output.push({ d: normalized });
      return;
    }

    const primitiveSeed = hashString(`${index}:${path}`, seed);
    const commands = normalizedCommands(path);
    output.push({ d: sketchPass(commands, roughness, primitiveSeed) });
    output.push({
      d: sketchPass(commands, roughness * 0.72, primitiveSeed ^ 0x9e3779b9),
      opacity: 0.72,
    });
  });

  return output;
}
