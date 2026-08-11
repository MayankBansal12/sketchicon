# SketchIcon Usage

## Install

Choose icon packs interactively:

```sh
npm create sketchicon@latest
```

Or install a provider manually:

```sh
npm install sketchicon @sketchicon/lucide
```

## Lucide

```tsx
import Search from "@sketchicon/lucide/icons/search";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Search} aria-label="Search" />;
```

Named imports are also supported:

```tsx
import { Search } from "@sketchicon/lucide";
```

## Hugeicons

```sh
npm install sketchicon @sketchicon/hugeicons
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
npm create sketchicon@latest -- --migrate
```

Add `--dry-run` to preview the import rewrites.
