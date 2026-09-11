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
    // Svg renders a native host directly, bypassing View's ARIA normalization
    // on React Native versions without native prop transformations.
    const label = svgProps["aria-label"] ?? accessibilityLabel;
    const labelledBy = svgProps["aria-labelledby"]?.split(/\s*,\s*/g)
      ?? svgProps.accessibilityLabelledBy;
    const isLabeled = Boolean(label || labelledBy);

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
        {...svgProps}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelledBy}
        accessibilityElementsHidden={
          svgProps["aria-hidden"] ?? svgProps.accessibilityElementsHidden ?? !isLabeled
        }
        importantForAccessibility={svgProps["aria-hidden"] === true
          ? "no-hide-descendants"
          : svgProps.importantForAccessibility ?? (isLabeled ? "auto" : "no-hide-descendants")}
      >
        {paths.map((path, index) => (
          <Path key={index} d={path.d} opacity={path.opacity} />
        ))}
      </Svg>
    );
  },
);
