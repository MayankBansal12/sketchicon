# Using SketchIcon

SketchIcon renders deterministic, hand-drawn icons as standard inline SVG. It supports React server rendering and does not require Canvas or browser APIs.

## Installation

```sh
npm install sketchicon
```

## React Usage

Import the component and icon geometry from the package root:

```tsx
import { Search, SketchIcon } from "sketchicon";

export function SearchButton() {
  return <SketchIcon icon={Search} size={20} aria-label="Search" />;
}
```

Named icon imports are tree-shakeable. A direct icon subpath is also available when needed:

```tsx
import Search from "sketchicon/icons/search";
import { SketchIcon } from "sketchicon/runtime";
```

The [icon catalog](/icons/catalog.md) lists canonical export names, direct-import slugs, and aliases.

## Properties

`SketchIcon` accepts an `icon` geometry and standard SVG properties, including:

- `size`: rendered width and height.
- `color`: SVG stroke color.
- `strokeWidth`: stroke width; defaults to `1.5`.
- `roughness`: hand-drawn displacement from `0` to `2`; defaults to `1.5`.
- `seed`: produces a stable variation of the sketch effect.
- `title`: accessible SVG title.
- `aria-label`, `aria-labelledby`, and `aria-hidden`: standard accessibility attributes.

```tsx
<SketchIcon
  icon={Search}
  size={24}
  color="currentColor"
  strokeWidth={1.75}
  roughness={0.8}
  seed={4}
  aria-label="Search"
/>
```

## Accessibility

Icons that communicate meaning need an accessible name. Use `aria-label` or `title`, or label the containing control. Mark a purely decorative icon with `aria-hidden="true"`.

```tsx
<button type="button">
  <SketchIcon icon={Search} aria-hidden="true" />
  <span>Search</span>
</button>
```

## Framework-Independent Rendering

Use the core renderer when React output is not required:

```ts
import { renderSketch } from "sketchicon/core";
```

`renderSketch` converts supported icon geometry into deterministic sketch paths. Refer to the package TypeScript declarations for its complete input and return types.
