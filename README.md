# sketchicon

sketchicon renders familiar interface icons with a deterministic hand-drawn stroke. Icons stay standard inline SVG, work with server rendering, and tree-shake like normal React exports.

![sketchicon hero](https://5kas5z928t.ufs.sh/f/wBHVA4PQTleALc26TYKCdjLUTKgwotXfG6krNbqJVaWev8Op)

![sketchicon icon library](https://5kas5z928t.ufs.sh/f/wBHVA4PQTleArhaGpaVZjTaS0yoe3bIXmLQzpq8wHCrskA5K)

<video src="https://5kas5z928t.ufs.sh/f/wBHVA4PQTleAgDzSdhqapQ7thT9Hr0VY6i482SsRAvoCykEF" controls muted playsinline width="100%"></video>

## Installation

```sh
npm install sketchicon
```

```sh
pnpm add sketchicon
yarn add sketchicon
bun add sketchicon
```

Use `sketchicon` for React. Use `@sketchicon/core` only when you need the framework-independent renderer directly.

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

Direct icon imports are also available:

```tsx
import Search from "sketchicon/icons/search";
import { SketchIcon } from "sketchicon/runtime";
```

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

## Agents and LLMs

sketchicon publishes agent-readable docs at `/llms.txt` on the docs site.

Use it when asking an agent to work with sketchicon. It points to:

- installation and usage docs
- icon catalog with export names and slugs
- the interactive icon browser

Agent guidance:

- Prefer named imports from `sketchicon`.
- Use `sketchicon/icons/<slug>` for direct per-icon imports.
- Do not copy SVG path data into your app.
- Give meaningful icons an accessible label. Hide decorative icons with `aria-hidden="true"`.

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
