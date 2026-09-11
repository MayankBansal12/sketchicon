# SketchIcon Usage

## Install

Choose icon packs interactively:

```sh
npx sketchicon@latest
```

Or install a provider manually:

```sh
npm install sketchicon@latest @sketchicon/lucide@latest
```

## Lucide

```tsx
import { Search } from "@sketchicon/lucide";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Search} aria-label="Search" />;
```

For a direct import in startup-sensitive Node.js environments:

```tsx
import Search from "@sketchicon/lucide/icons/search";
```

## Hugeicons

```sh
npm install sketchicon@latest @sketchicon/hugeicons@latest
```

```tsx
import { Home01Icon } from "@sketchicon/hugeicons";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Home01Icon} aria-label="Home" />;
```

For a direct import:

```tsx
import Home01Icon from "@sketchicon/hugeicons/icons/home-01";
```

## Options

`roughness` defaults to `1.5` and accepts values from `0` to `2`. Standard SVG props such as `size`, `color`, and `strokeWidth` are supported.

```tsx
<SketchIcon icon={Search} size={20} roughness={0.8} strokeWidth={1.5} />
```

Meaningful icons need an accessible name. Decorative icons should be hidden:

```tsx
<SketchIcon icon={Search} aria-label="Search" />
<SketchIcon icon={Search} aria-hidden="true" />
```

## Custom geometry and core

```tsx
import { SketchIcon } from "sketchicon";

const geometry = {
  viewBox: "0 0 24 24",
  primitives: [{ type: "line", x1: 3, y1: 12, x2: 21, y2: 12 }],
} as const;

<SketchIcon icon={geometry} />;
```

```ts
import { renderSketch } from "sketchicon/core";
```

## Migrate from 0.1

```sh
npx sketchicon@latest --migrate
```

Add `--dry-run` to preview the import rewrites.

## Other renderers

Choose the renderer independently of the icon packs:

```sh
npx sketchicon@latest --framework preact --lucide
npx sketchicon@latest --framework vanilla --hugeicons
```

The initializer installs `@sketchicon/preact` or `@sketchicon/dom` plus the selected packs. These adapters do not require React. `--framework react` is the default. It does not convert existing components between frameworks; the 0.1 migration requires the React renderer.

Preact uses the same component props and geometry:

```tsx
import { SketchIcon } from "@sketchicon/preact";
import Search from "@sketchicon/lucide/icons/search";

<SketchIcon icon={Search} size={24} title="Search" />;
```

Use Preact's JSX configuration (`jsxImportSource: "preact"`). The adapter supports SVG refs, native events, server rendering, and hydration. See [Preact documentation](https://github.com/MayankBansal12/sketchicon/blob/main/packages/preact/README.md).

Vanilla JavaScript creates ordinary SVG elements:

```js
import { createSketchIcon, updateSketchIcon } from "@sketchicon/dom";
import Home from "@sketchicon/hugeicons/icons/home-01";

const icon = createSketchIcon(Home, { size: 24, title: "Home" });
document.body.append(icon);
updateSketchIcon(icon, Home, { size: 32, roughness: 0.8, title: "Home" });
```

Updates preserve the SVG element and its listeners. Pass the complete next options; omitted options reset to defaults. Native SVG attributes go in `attributes`, such as `{ class: "icon", "aria-label": "Home" }`.

A self-contained browser build also supports plain HTML without a bundler. See the [vanilla JavaScript and no-build guide](https://github.com/MayankBansal12/sketchicon/blob/main/packages/dom/README.md).
