import { renderSketch, type SketchGeometry } from "@sketchicon/core";
import type { SVGProps } from "react";

type SerializableSvgProps = {
  [Key in keyof SVGProps<SVGSVGElement> as Key extends `on${string}`
    ? never
    : Key]: SVGProps<SVGSVGElement>[Key];
};

export type SketchIconServerProps = Omit<
  SerializableSvgProps,
  "children" | "dangerouslySetInnerHTML" | "ref"
> & {
  icon: SketchGeometry;
  roughness?: number;
  seed?: number;
  size?: number | string;
  title?: string;
};

/** A hook-free renderer for React Server Components and server-only modules. */
export function SketchIcon({
  icon,
  roughness = 1.5,
  seed = 0,
  size = 24,
  title,
  strokeWidth = 1.5,
  ...svgProps
}: SketchIconServerProps) {
  const paths = renderSketch(icon, { roughness, seed });
  const isLabeled = Boolean(
    title || svgProps["aria-label"] || svgProps["aria-labelledby"],
  );

  return (
    <svg
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
}
