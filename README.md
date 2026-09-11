# sketchicon

SketchIcon renders familiar interface icons with a deterministic hand-drawn stroke. Icons stay standard inline SVG, work with server rendering, and use optional provider packages so projects install only the catalogs they choose.

The unified browser includes 7,042 compatible icons from Lucide and Hugeicons Core Free.

![sketchicon hero](https://5kas5z928t.ufs.sh/f/wBHVA4PQTleALc26TYKCdjLUTKgwotXfG6krNbqJVaWev8Op)

## Installation

Run the initializer and select one or more icon packs:

```sh
npx sketchicon@latest
```

For CI or other non-interactive environments:

```sh
npx --yes sketchicon@latest --lucide
npx --yes sketchicon@latest --hugeicons
npx --yes sketchicon@latest --all
```

The scalable `--packs lucide,hugeicons` syntax is also available. The previous
`npx create-sketchicon@latest` command remains supported as an alias.

By default, the initializer installs the lightweight `sketchicon` React runtime plus only the selected geometry packages:

- `@sketchicon/lucide`
- `@sketchicon/hugeicons`

Manual installation also works:

```sh
npm install sketchicon@latest @sketchicon/lucide@latest
```

## Usage

```tsx
import Search from "@sketchicon/lucide/icons/search";
import { SketchIcon } from "sketchicon";

export function SearchButton() {
  return <SketchIcon icon={Search} size={20} aria-label="Search" />;
}
```

Hugeicons use the same renderer:

```tsx
import Home01Icon from "@sketchicon/hugeicons/icons/home-01";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Home01Icon} aria-label="Home" />;
```

Direct icon subpaths are the recommended imports for native ESM, SSR, tests, CLIs,
and serverless functions. They load one geometry module instead of evaluating the
provider barrel during process startup:

```tsx
import Search from "@sketchicon/lucide/icons/search";
import Home01Icon from "@sketchicon/hugeicons/icons/home-01";
```

Named barrel imports remain a convenient option in applications built by a modern
tree-shaking bundler:

```tsx
import { Search } from "@sketchicon/lucide";
import { Home01Icon } from "@sketchicon/hugeicons";
```

## Preact and vanilla JavaScript

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

Use Preact's JSX configuration (`jsxImportSource: "preact"`). The adapter supports SVG refs through `svgRef`, native events, server rendering, and hydration. See [Preact documentation](packages/preact/README.md).

Vanilla JavaScript creates ordinary SVG elements:

```js
import { createSketchIcon, updateSketchIcon } from "@sketchicon/dom";
import Home from "@sketchicon/hugeicons/icons/home-01";

const icon = createSketchIcon(Home, { size: 24, title: "Home" });
document.body.append(icon);
updateSketchIcon(icon, Home, { size: 32, roughness: 0.8, title: "Home" });
```

Updates preserve the SVG element and its listeners. Pass the complete next options; omitted options reset to defaults. Native SVG attributes go in `attributes`, such as `{ class: "icon", "aria-label": "Home" }`.

A self-contained browser build also supports plain HTML without a bundler. See the [vanilla JavaScript and no-build guide](packages/dom/README.md).

## React Server Components

The default `sketchicon` entry is explicitly a client component so refs and event
handlers continue to work in React 18 and 19. React Server Component modules can
avoid that client boundary with the hook-free server entry:

```tsx
import Search from "@sketchicon/lucide/icons/search";
import { SketchIcon } from "sketchicon/server";

export function SearchGlyph() {
  return <SketchIcon icon={Search} title="Search" />;
}
```

`sketchicon/server` accepts serializable SVG props but intentionally excludes refs,
event handlers, children, and `dangerouslySetInnerHTML`. Use `sketchicon` when the
icon needs client interactivity or a ref. Both entries produce the same deterministic
SVG markup and work with conventional React 18 or 19 server-side static rendering.
Stable React Server Components require React 19; React 18's published
`react-server` condition is explicitly unsupported by React itself.

`roughness` defaults to `1.5` and is clamped between `0` and `2`. `strokeWidth` defaults to `1.5`. Regular SVG props are supported.

The component also accepts custom geometry:

```tsx
import { SketchIcon } from "sketchicon";

const geometry = {
  viewBox: "0 0 24 24",
  primitives: [{ type: "line", x1: 3, y1: 12, x2: 21, y2: 12 }],
} as const;

<SketchIcon icon={geometry} title="Divider" />;
```

The framework-independent renderer remains available from either entry:

```ts
import { renderSketch } from "sketchicon/core";
// or: import { renderSketch } from "@sketchicon/core";
```

## Migrating from 0.1

Version `0.2.0` moves the built-in Lucide catalog into an optional package. The renderer API and visual output remain compatible.

```sh
npx sketchicon@latest --migrate
```

The migration installs the detected providers and rewrites catalog imports. Use `--dry-run` to preview its changes.

```diff
-import { Search, SketchIcon } from "sketchicon";
+import { Search } from "@sketchicon/lucide";
+import { SketchIcon } from "sketchicon";
```

Consumers using `^0.1.5` remain on the `0.1` release line until they intentionally upgrade.
The initializer detects a `0.1` dependency and automatically includes migration even when it is run without `--migrate`.

Existing Lucide icons remain Lucide during migration. Choosing Hugeicons does not guess replacements for them: the initializer installs both providers so the project keeps working. To finish a Hugeicons-only conversion, replace the migrated Lucide icons and then remove `@sketchicon/lucide` with your package manager.

The initializer adds the selected providers but does not remove provider packages that are already installed. It reports those packages so dependency removal remains an explicit choice.

## Packages

| Package | Responsibility |
| --- | --- |
| `@sketchicon/core` | Framework-independent deterministic renderer |
| `sketchicon` | Lightweight React component, compatibility subpaths, and installer command |
| `@sketchicon/preact` | Preact component and types |
| `@sketchicon/dom` | Vanilla SVG creation, updates, and browser build |
| `@sketchicon/lucide` | Generated Lucide geometry |
| `@sketchicon/hugeicons` | Generated Hugeicons Core Free geometry |
| `create-sketchicon` | Backward-compatible alias for the installer command |

The website remains a unified searchable catalog even though npm distribution is modular.

## Development

This repository uses npm workspaces and Node.js 22.22.0 or newer. Published packages support Node.js 20.11.1 or newer.

```sh
npm install
npm run check
npm run dev
```

`npm run generate` rebuilds both provider packages, compatibility reports, and the unified website catalog. Filled or otherwise incompatible icons are excluded rather than silently rendered incorrectly.

See [TESTING.md](./TESTING.md) for the packed-package, installer, framework, and
post-publication verification matrix.

Rendering output is stable within a package version. The renderer does not use Canvas, the browser DOM, or `Math.random()`.
