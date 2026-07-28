import { palette } from "../theme";

export function RoughBox({
  className = "",
  fill = "none",
  seed,
  stroke = palette.ink,
}: {
  className?: string;
  fill?: string;
  seed: number;
  stroke?: string;
}) {
  const offset = ((seed % 7) - 3) * 0.32;
  const outline = `M${4 + offset} 5 C52 3.8 147 5.7 ${195 - offset} 4.4 C196.4 29 194.8 70 195.5 95 C145 96.4 53 94.6 4.6 95.5 C3.6 70 5.3 29 ${4 + offset} 5 Z`;
  const secondLine = `M${5 - offset} 4.2 C55 5.4 145 3.5 ${194 + offset} 5.2 C195.2 31 196 69 194.4 94 C143 95.1 56 96.1 5.3 94.2 C4.2 68 3.8 31 ${5 - offset} 4.2`;

  return (
    <svg
      className={`rough-box ${className}`}
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={outline} fill={fill} stroke={stroke} strokeWidth="1.25" />
      <path d={secondLine} fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.55" />
    </svg>
  );
}

// RoughBox's wobble is tuned for large panels: shrink it to a chip and the
// deviation lands under a pixel, so the outline flattens into a plain
// rectangle. This variant keeps a short viewBox and exaggerated control points
// so the line still reads as drawn at ~80x34px, and lets the strokes overshoot
// the corners the way a pen does.
export function RoughTag({
  className = "",
  fill = "none",
  seed,
  stroke = palette.ink,
}: {
  className?: string;
  fill?: string;
  seed: number;
  stroke?: string;
}) {
  const drift = ((seed % 5) - 2) * 0.7;
  const lift = ((seed % 3) - 1) * 0.8;
  const outline = `M${5 + drift} ${6 - lift} C28 ${3.4 + lift} 64 ${7.6 + lift} ${95 - drift} 4.8 C97.4 14 95.8 27 96.4 ${34 + lift} C66 ${37.4 - lift} 32 ${33.2 + lift} ${5.6 + drift} 35.8 C3.2 26 5.4 15 ${5 + drift} ${6 - lift} Z`;
  const secondLine = `M${7.5 + drift} ${4.4 + lift} C36 7.8 72 2.6 ${93 - drift} 6.4 C95.8 17 97.2 26 94.6 33 C62 36.4 38 37.2 ${3.4 + drift} 33.4`;

  return (
    <svg
      className={`rough-box ${className}`}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={outline} fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d={secondLine}
        fill="none"
        stroke={stroke}
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
