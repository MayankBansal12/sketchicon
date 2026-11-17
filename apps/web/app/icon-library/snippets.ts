import type { CatalogIconMetadata } from "../generated/catalog";
import { formatIconImport } from "./catalog";

export type SnippetFramework = "react" | "vue" | "preact" | "vanilla" | "next" | "react-native" | "expo";

export function formatUsageSnippet(
  icon: CatalogIconMetadata,
  framework: SnippetFramework,
  { size, roughness, strokeWidth, color }: { size: number; roughness: number; strokeWidth: number; color: string },
): string {
  const iconImport = formatIconImport(icon);
  if (framework === "vue") {
    return `<script setup>
${iconImport}
import { SketchIcon } from "@sketchicon/vue";
</script>

<template>
  <SketchIcon :icon="${icon.name}" :size="${size}" :roughness="${roughness.toFixed(1)}" :stroke-width="${strokeWidth.toFixed(1)}" color=${JSON.stringify(color)} />
</template>`;
  }
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
import { SketchIcon } from "${framework === "preact" ? "@sketchicon/preact" : framework === "next" ? "sketchicon/server" : framework === "expo" || framework === "react-native" ? "sketchicon/native" : "sketchicon"}";

<SketchIcon
  icon={${icon.name}}
  size={${size}}
  roughness={${roughness.toFixed(1)}}
  strokeWidth={${strokeWidth.toFixed(1)}}
  color=${JSON.stringify(color)}
/>`;
}
