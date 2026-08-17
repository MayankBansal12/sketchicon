# SketchIcon

## Vision

SketchIcon is a deterministic SVG renderer that transforms stroke-based icon geometry into a consistent hand-drawn visual style.

Instead of maintaining a custom sketch icon pack, developers can reuse familiar icon geometry while giving it a cohesive, restrained double-stroke appearance.

## Product Goals

- Transform stroke-based SVG geometry into sketch-rendered paths.
- Produce identical output for identical input, options, and package version.
- Preserve icon silhouette and recognizability, including at 16px.
- Keep the documented public controls small: standard SVG props and optional `roughness`.
- Output standard inline SVG suitable for React and server rendering.
- Keep the rendering engine reusable for future borders, dividers, arrows, shapes, and underlines.

## Product Architecture

SketchIcon serves React applications through a small runtime and optional icon catalogs. It includes:

- A framework-independent TypeScript rendering engine.
- A generic React `SketchIcon` component for custom geometry.
- Independent, tree-shakeable geometry packages for the compatible Lucide and Hugeicons Core Free catalogs.
- An interactive initializer that installs only the providers a project selects.
- A searchable icon library on the main website.
- Build-time reporting for excluded icons.

Filled SVG elements are not supported. Source icons containing fills or other incompatible presentation are excluded during generation rather than rendered incorrectly or silently changed.

## Public API

Provider geometry and the universal renderer are the primary API:

```tsx
import { Search } from "@sketchicon/lucide";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Search} size={24} aria-label="Search" />;
```

The generic React component accepts a serializable geometry model:

```tsx
import { SketchIcon } from "sketchicon";

<SketchIcon icon={geometry} roughness={1.5} />;
```

`roughness` is optional, defaults to `1.5`, and is clamped from `0` to `2`. A value of `0` returns clean geometry. Rendering uses a fixed internal seed, with each primitive salted by its geometry so unrelated icons do not repeat the same wobble.

## Technical Principles

### Rendering Engine First

The engine transforms normalized SVG primitives into sketch-rendered path records. It remains independent of React and Lucide so future consumers can share one rendering behavior.

### Deterministic

Rendering never changes unless geometry, configuration, or package version changes. The implementation uses a seeded pseudo-random generator and never calls `Math.random()`.

### SVG In, SVG Out

The renderer remains SVG-native and does not require Canvas, a browser DOM, or post-mount measurement.

### Library Agnostic

Catalogs are generated at publish time and distributed independently from the runtime. Lucide uses `@sketchicon/lucide`, Hugeicons uses `@sketchicon/hugeicons`, and the website combines both for discovery. The engine supports paths, lines, polylines, polygons, circles, ellipses, and rectangles.

### Static by Default

Sketch geometry does not regenerate on hover, click, or rerender. Animation is outside the first-release scope.

## Compatibility

- Modern Chrome, Safari, Firefox, and Edge.
- React 18 and React 19.
- Server rendering without hydration differences.
- Node.js 22.22.0 or newer for repository development and generation.
- Published packages support Node.js 20.11.1 or newer.
