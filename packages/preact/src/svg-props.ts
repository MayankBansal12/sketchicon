import type { JSX } from "preact";

// Only SVG presentation attributes use hyphenated names. Attributes such as
// viewBox, preserveAspectRatio, and markerWidth must retain their case.
const dashedAttributes = new Set(`
  accent-height alignment-baseline allow-reorder arabic-form baseline-shift
  cap-height clip-path clip-rule color-interpolation color-interpolation-filters
  color-profile color-rendering content-script-type content-style-type
  dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity
  font-family font-size font-size-adjust font-stretch font-style font-variant font-weight
  glyph-name glyph-orientation-horizontal glyph-orientation-vertical
  horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color
  marker-end marker-mid marker-start overline-position overline-thickness paint-order
  panose-1 pointer-events rendering-intent repeat-count repeat-dur shape-rendering
  stop-color stop-opacity strikethrough-position strikethrough-thickness
  stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit
  stroke-opacity stroke-width text-anchor text-decoration text-rendering transform-origin
  underline-position underline-thickness unicode-bidi unicode-range units-per-em
  v-alphabetic vector-effect vert-adv-y vert-origin-x vert-origin-y v-hanging
  v-ideographic v-mathematical word-spacing writing-mode x-height
`.trim().split(/\s+/));

/** Normalize only this SVG's props, preserving native event names and values. */
export function normalizeSvgProps(
  props: JSX.SVGAttributes<SVGSVGElement>,
): JSX.SVGAttributes<SVGSVGElement> {
  const entries = Object.entries(props).flatMap(([name, value]) => {
    const dashed = name.replace(/[A-Z0-9]/g, "-$&").toLowerCase();
    if (name !== dashed && dashedAttributes.has(dashed)) {
      // An explicitly provided native name takes precedence over its alias.
      return Object.hasOwn(props, dashed) ? [] : [[dashed, value]];
    }
    return [[name, value]];
  });
  return Object.fromEntries(entries);
}
