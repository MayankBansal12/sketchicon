# SketchIcon

SketchIcon renders familiar interface icons with a deterministic, hand-drawn double stroke. Icons remain standard inline SVG and work with server rendering.

## Installation

```sh
npm install sketchicon
```

SketchIcon is currently in beta. API is stable but be careful while using in production setups. Report any issues to [mayankbansal125@gmail.com](mailto:mayankbansal125@gmail.com) or open a [GitHub issue](https://github.com/MayankBansal12/sketchicon/issues).

## Usage

```tsx
import { Search, SketchIcon } from "sketchicon";

export function SearchButton() {
  return <SketchIcon icon={Search} size={20} aria-label="Search" />;
}
```

`roughness` is optional and defaults to `1.5`. It is clamped between `0` and `2`:

```tsx
<SketchIcon icon={Search} roughness={0.8} />
```

`strokeWidth` defaults to `1.5`.

Regular SVG props are supported. Named icon imports are tree-shakeable, so unused icon geometry is excluded from application bundles.

The same component also accepts custom geometry:

```tsx
import { SketchIcon } from "sketchicon";

const geometry = {
  viewBox: "0 0 24 24",
  primitives: [{ type: "line", x1: 3, y1: 12, x2: 21, y2: 12 }],
} as const;

<SketchIcon icon={geometry} title="Divider" />;
```

The framework-independent renderer is available from the package subpath:

```ts
import { renderSketch } from "sketchicon/core";
```

## Development

This repository uses npm workspaces and requires Node.js 22.22.0 or newer for development. Published packages continue to support Node.js 20.11.1 or newer.

```sh
npm install
npm run check
npm run dev
```

`npm run generate` rebuilds the compatible icon geometry catalog. Filled icons are excluded rather than silently rendered incorrectly. Third-party attribution is included with the published package.

## Rendering Model

The core converts SVG primitives to paths, normalizes path commands, and applies seeded bounded displacement. Each primitive gets two stable passes. It does not use Canvas, the browser DOM, or `Math.random()`.

Rendering output is stable within a package version. A future version may refine the visual algorithm and produce different paths.
