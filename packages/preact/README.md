# @sketchicon/preact

Hand-drawn SVG icons for Preact 10.29.8 and later in the 10.x release line. Uses Preact's JSX runtime, hooks, types, and ref forwarding. React is not required.

## Install

```sh
npx sketchicon@latest --framework preact --lucide
# or, in a Preact application:
npm install @sketchicon/preact @sketchicon/lucide
```

Configure JSX with `"jsx": "react-jsx"` and `"jsxImportSource": "preact"` in TypeScript, or your bundler's Preact preset.

```tsx
import { SketchIcon } from "@sketchicon/preact";
import Search from "@sketchicon/lucide/icons/search";

<SketchIcon icon={Search} size={24} title="Search" />;
```

The same component accepts Hugeicons geometry from `@sketchicon/hugeicons/icons/home-01` and custom `SketchGeometry`.

## Options

| Option | Default |
| --- | --- |
| `size` | `24` (number or string) |
| `roughness` | `1.5`, clamped to 0–2 |
| `seed` | `0` |
| `strokeWidth` | `1.5` |
| `title` | None |

Preact SVG attributes, native event handlers, and an SVG `ref` are supported. Supply `title`, `aria-label`, or `aria-labelledby` for meaningful icons; unlabeled icons default to `aria-hidden="true"`. Explicit SVG attributes override defaults. Children and raw HTML are not part of the component API.

The component works with `preact-render-to-string` and Preact hydration using identical geometry, seed, and options on the server and client. Import `SketchIcon` from this package in both places; no separate server entry is needed. React Server Components remain specific to `sketchicon/server`.

Direct icon imports load one geometry module. Named provider imports also work with tree-shaking bundlers. Rendering is deterministic within a package version.
