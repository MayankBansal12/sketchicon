# SketchIcon

Hand-drawn sketch icons for React, rendered as deterministic inline SVG.

## Install

```sh
npm install sketchicon
```

SketchIcon is currently in beta. API is stable but be careful while using in production setups. Report any issues to [mayankbansal125@gmail.com](mailto:mayankbansal125@gmail.com) or open a [GitHub issue](https://github.com/MayankBansal12/sketchicon/issues).

## Use

```tsx
import { Search, SketchIcon } from "sketchicon";

export function SearchButton() {
  return <SketchIcon icon={Search} size={20} aria-label="Search" />;
}
```

`roughness` is optional, defaults to `1.5`, and accepts values from `0` to `2`.

```tsx
<SketchIcon icon={Search} roughness={0.8} />
```

Standard SVG props such as `size`, `color`, `strokeWidth` (defaults to `1.5`), and accessibility attributes are supported. Named icon imports are tree-shakeable.

The framework-independent renderer is available from the same installation:

```ts
import { renderSketch } from "sketchicon/core";
```
