import Github from "@sketchicon/hugeicons/icons/github";
import Npm from "@sketchicon/hugeicons/icons/npm";
import { SketchIcon } from "sketchicon/runtime";

export function GithubMark() {
  return <SketchIcon icon={Github} roughness={0.8} seed={37} strokeWidth={1.45} />;
}

export function NpmMark() {
  return <SketchIcon className="npm-mark" icon={Npm} roughness={0.7} seed={53} strokeWidth={1.2} />;
}
