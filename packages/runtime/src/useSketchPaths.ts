import { renderSketch, type SketchGeometry } from "@sketchicon/core";
import { useMemo } from "react";

interface CachedPaths {
  signature: string;
  paths: ReturnType<typeof renderSketch>;
}

const defaultPathCache = new WeakMap<SketchGeometry, CachedPaths>();

function getPaths(
  icon: SketchGeometry,
  roughness: number,
  seed: number,
  signature?: string,
) {
  if (roughness !== 1.5 || seed !== 0) {
    return renderSketch(icon, { roughness, seed });
  }

  const cacheSignature = signature ?? JSON.stringify(icon.primitives);
  const cached = defaultPathCache.get(icon);
  if (cached && cached.signature === cacheSignature) return cached.paths;

  const paths = renderSketch(icon, { roughness, seed });
  defaultPathCache.set(icon, { signature: cacheSignature, paths });
  return paths;
}

export function useSketchPaths(icon: SketchGeometry, roughness: number, seed: number) {
  const signature = roughness === 1.5 && seed === 0
    ? JSON.stringify(icon.primitives)
    : undefined;
  return useMemo(
    () => getPaths(icon, roughness, seed, signature),
    [icon, roughness, seed, signature],
  );
}
