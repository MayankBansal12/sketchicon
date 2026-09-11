import type { SketchGeometry } from "@sketchicon/core";
import { forwardRef } from "react";
import Svg, { Path, type SvgProps } from "react-native-svg";
import { useSketchPaths } from "./useSketchPaths.js";

export interface SketchIconProps extends Omit<SvgProps, "children"> {
  icon: SketchGeometry;
  roughness?: number;
  seed?: number;
  size?: number | string;
  /** A convenience alias for accessibilityLabel. */
  title?: string;
}

export const SketchIcon = forwardRef<Svg, SketchIconProps>(
  function SketchIcon(
    {
      icon,
      roughness = 1.5,
      seed = 0,
      size = 24,
      title,
      color = "black",
      strokeWidth = 1.5,
      accessibilityLabel = title,
      ...svgProps
    },
    ref,
  ) {
    const paths = useSketchPaths(icon, roughness, seed);
    const isLabeled = Boolean(
      accessibilityLabel || svgProps["aria-label"] ||
      svgProps.accessibilityLabelledBy || svgProps["aria-labelledby"],
    );

    return (
      <Svg
        ref={ref}
        width={size}
        height={size}
        viewBox={icon.viewBox ?? "0 0 24 24"}
        fill="none"
        color={color}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        accessible={isLabeled}
        accessibilityRole={isLabeled ? "image" : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityElementsHidden={!isLabeled}
        importantForAccessibility={isLabeled ? "auto" : "no-hide-descendants"}
        {...svgProps}
      >
        {paths.map((path, index) => (
          <Path key={index} d={path.d} opacity={path.opacity} />
        ))}
      </Svg>
    );
  },
);
