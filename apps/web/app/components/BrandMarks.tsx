import type { SketchGeometry } from "sketchicon/core";
import { SketchIcon } from "sketchicon/runtime";

const githubGeometry = {
  viewBox: "0 0 24 24",
  primitives: [
    {
      type: "path",
      d: "M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.22c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18A11 11 0 0 1 12 6.14c.98 0 1.95.13 2.86.38 2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.25c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z",
    },
  ],
} satisfies SketchGeometry;

export function GithubMark() {
  return <SketchIcon icon={githubGeometry} roughness={0.8} seed={37} strokeWidth={1.45} />;
}

export function NpmMark() {
  return (
    <svg className="npm-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M0 7.33v8h6.67v1.34H12v-1.34h12v-8H0Zm6.67 6.67H4v-4h2.67v4Zm4 0H8V8.67h5.33V14H12v-4h-1.33v4Zm10.66 0H20v-4h-1.33v4h-1.34v-4H16v4h-1.33V8.67h6.66V14Z" />
    </svg>
  );
}
