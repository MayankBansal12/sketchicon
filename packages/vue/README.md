# @sketchicon/vue

Vue 3 render-function adapter for deterministic, hand-drawn SketchIcon geometry.

```vue
<script setup lang="ts">
import { Search } from "@sketchicon/lucide";
import { SketchIcon } from "@sketchicon/vue";
</script>

<template>
  <SketchIcon :icon="Search" aria-label="Search" />
</template>
```

Install `@sketchicon/vue` with one or both framework-neutral geometry catalogs:

```sh
npm install @sketchicon/vue @sketchicon/lucide
```

The component supports `icon`, `size`, `roughness`, `seed`, `strokeWidth`, and
`title`. Other attributes and listeners are forwarded to the rendered `svg`.
Unlabeled icons are hidden from assistive technology; `title`, `aria-label`, or
`aria-labelledby` gives the SVG `role="img"`.
