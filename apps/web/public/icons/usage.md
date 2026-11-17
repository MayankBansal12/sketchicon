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

## React Native and Expo

Use the `sketchicon/native` entry for React Native 0.79+ and Expo SDK 53+.
It renders with `react-native-svg` and accepts the same Lucide, Hugeicons, and
custom geometry. Metro package exports must remain enabled (the default in
these versions) so the native entry and direct icon imports can resolve.

In an existing Expo app:

```sh
npm install sketchicon @sketchicon/lucide
npx expo install react-native-svg
```

Expo Go includes the native SVG implementation. Use `expo install` to select the
JavaScript version compatible with your SDK; no SVG transformer is needed.

In an existing bare React Native app:

```sh
npm install sketchicon @sketchicon/lucide react-native-svg
cd ios && pod install
```

Rebuild the native app after adding `react-native-svg`. Choose a 15.x version
compatible with your React Native version using the
[react-native-svg compatibility table](https://github.com/software-mansion/react-native-svg#supported-react-native-versions).

```tsx
import Search from "@sketchicon/lucide/icons/search";
import { SketchIcon } from "sketchicon/native";

export function SearchIcon() {
  return (
    <SketchIcon
      icon={Search}
      size={24}
      color="#2563eb"
      accessibilityLabel="Search"
      style={{ margin: 8 }}
    />
  );
}
```

Hugeicons work by installing `@sketchicon/hugeicons` and passing geometry such as
`import Home from "@sketchicon/hugeicons/icons/home-01"`. Prefer direct icon imports
to avoid loading the entire catalog in Metro.

`size`, `roughness`, `seed`, and `strokeWidth` keep the web defaults. Native color
defaults to black; pass `color` or `stroke` explicitly because React Native does
not inherit CSS text color. Native SVG props such as `style`, `onPress`, `testID`,
`width`, and `height` pass through. Refs point to the `react-native-svg` `Svg`
instance rather than an `SVGSVGElement`.

Use `accessibilityLabel` for meaningful icons; `title` is an alias for that label.
Unlabeled icons are hidden from accessibility by default. Explicit accessibility
props can override these defaults. Use a labeled React Native `Pressable` around
a decorative icon when building an icon button.

The native entry also works with Expo web. The `sketchicon` and
`sketchicon/runtime` entries continue to render browser SVG. The initializer
selects icon packs; install `react-native-svg` separately with the command above.
Web-only consumers do not need either native peer dependency.

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

Preact uses the same drawing options and geometry:

```tsx
import { SketchIcon } from "@sketchicon/preact";
import Search from "@sketchicon/lucide/icons/search";

<SketchIcon icon={Search} size={24} title="Search" />;
```

Use Preact's JSX configuration (`jsxImportSource: "preact"`). The adapter supports SVG refs through `svgRef`, native events, server rendering, and hydration. See [Preact documentation](https://github.com/MayankBansal12/sketchicon/blob/main/packages/preact/README.md).

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

## Framework-aware installer

Run `npx sketchicon@latest --yes` inside an existing React, Next.js, Vue/Nuxt, Preact, React Native, or Expo project. Select plain JavaScript explicitly with `--framework vanilla`. Use `--framework react|vue|preact|vanilla|next|react-native|expo` to override detection, `--cwd` to target a workspace package, and `--dry-run` to preview commands.

Vue uses `@sketchicon/vue`; Preact uses `@sketchicon/preact`; vanilla uses `@sketchicon/dom`. Next.js server components use `sketchicon/server`. React Native and Expo use `sketchicon/native`. Expo's SVG dependency is installed with `expo install` to match the SDK. All adapters share the same icon packs and deterministic drawing options.

```vue
<script setup>
import { SketchIcon } from "@sketchicon/vue";
import Search from "@sketchicon/lucide/icons/search";
</script>

<template>
  <SketchIcon :icon="Search" :size="24" title="Search" />
</template>
```
