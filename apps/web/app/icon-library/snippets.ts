import type { CatalogIconMetadata } from "../generated/catalog";
import { formatIconImport } from "./catalog";

export type SnippetFramework = "react" | "preact" | "vanilla";

export function formatUsageSnippet(
  icon: CatalogIconMetadata,
  framework: SnippetFramework,
  { size, roughness, strokeWidth, color }: { size: number; roughness: number; strokeWidth: number; color: string },
): string {
  const iconImport = formatIconImport(icon);
  if (framework === "vanilla") {
    return `${iconImport}
import { createSketchIcon } from "@sketchicon/dom";

const icon = createSketchIcon(${icon.name}, {
  size: ${size},
  roughness: ${roughness.toFixed(1)},
  strokeWidth: ${strokeWidth.toFixed(1)},
  color: ${JSON.stringify(color)},
});
document.body.append(icon);`;
  }
  return `${iconImport}
import { SketchIcon } from "${framework === "preact" ? "@sketchicon/preact" : "sketchicon"}";

<SketchIcon
  icon={${icon.name}}
  size={${size}}
  roughness={${roughness.toFixed(1)}}
  strokeWidth={${strokeWidth.toFixed(1)}}
  color=${JSON.stringify(color)}
/>`;
}
