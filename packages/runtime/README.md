# sketchicon

The lightweight React and React Native runtime for deterministic hand-drawn SVG geometry.

Use the initializer to select optional catalogs:

```sh
npx sketchicon@latest
```

Use `--lucide`, `--hugeicons`, or `--all` for a non-interactive one-command setup.
`npx create-sketchicon@latest` remains available as a compatibility alias.

Or install manually:

```sh
npm install sketchicon@latest @sketchicon/lucide@latest
```

```tsx
import Search from "@sketchicon/lucide/icons/search";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Search} aria-label="Search" />;
```

Use `sketchicon/server` in React Server Component modules that do not need refs or
event handlers. It is hook-free, has no `"use client"` boundary, and produces the
same SVG markup as the default client entry. The `sketchicon/runtime` and
`sketchicon/core` entry points remain available for compatibility. Conventional
SSR is covered on React 18 and 19; the React Server Component condition requires
React 19 because stable React 18 marks that condition unsupported.

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
