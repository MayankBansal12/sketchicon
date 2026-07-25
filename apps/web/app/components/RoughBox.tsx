export function RoughBox({
  className = "",
  fill = "none",
  seed,
  stroke = "#1f1f1f",
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
