# SketchIcon

Hand-drawn sketch icons for React, rendered as deterministic inline SVG.

## Install

```sh
npm install sketchicon
```

## Use

```tsx
import { Search, SketchIcon } from "sketchicon";

export function SearchButton() {
  return <SketchIcon icon={Search} size={20} aria-label="Search" />;
}
```

`roughness` is optional, defaults to `1`, and accepts values from `0` to `2`.

```tsx
<SketchIcon icon={Search} roughness={1.5} />
```

Standard SVG props such as `size`, `color`, `strokeWidth`, and accessibility attributes are supported. Named icon imports are tree-shakeable.

The framework-independent renderer is available from the same installation:

```ts
import { renderSketch } from "sketchicon/core";
```
