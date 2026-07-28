import { renderSketch, type SketchGeometry } from "@sketchicon/core";
import { forwardRef, useMemo, type SVGProps } from "react";

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
    const paths = useMemo(
      () => renderSketch(icon, { roughness, seed }),
      [icon, roughness, seed],
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
