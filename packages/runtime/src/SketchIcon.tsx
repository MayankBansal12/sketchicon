import {
  renderSketch,
  type SketchGeometry,
} from "@sketchicon/core";
import { forwardRef, useMemo, type SVGProps } from "react";

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

export interface SketchIconProps
  extends Omit<SVGProps<SVGSVGElement>, "children"> {
  icon: SketchGeometry;
  roughness?: number;
  seed?: number;
  size?: number | string;
  title?: string;
}

export const SketchIcon = forwardRef<SVGSVGElement, SketchIconProps>(
  function SketchIcon(
    {
      icon,
      roughness = 1.5,
      seed = 0,
      size = 24,
      title,
      strokeWidth = 1.5,
      ...svgProps
    },
    ref,
  ) {
    const signature = roughness === 1.5 && seed === 0
      ? JSON.stringify(icon.primitives)
      : undefined;
    const paths = useMemo(
      () => getPaths(icon, roughness, seed, signature),
      [icon, roughness, seed, signature],
    );
    const isLabeled = Boolean(
      title || svgProps["aria-label"] || svgProps["aria-labelledby"],
    );

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={icon.viewBox ?? "0 0 24 24"}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={isLabeled ? "img" : undefined}
        aria-hidden={isLabeled ? undefined : true}
        {...svgProps}
      >
        {title ? <title>{title}</title> : null}
        {paths.map((path, index) => (
          <path key={index} d={path.d} opacity={path.opacity} />
        ))}
      </svg>
    );
  },
);
