# sketchicon

SketchIcon renders familiar interface icons with a deterministic hand-drawn stroke. Icons stay standard inline SVG, work with server rendering, and use optional provider packages so projects install only the catalogs they choose.

The unified browser includes 7,042 compatible icons from Lucide and Hugeicons Core Free.

![sketchicon hero](https://5kas5z928t.ufs.sh/f/wBHVA4PQTleALc26TYKCdjLUTKgwotXfG6krNbqJVaWev8Op)

## Installation

Run the initializer and select one or more icon packs:

```sh
npm create sketchicon@latest
```

For CI or other non-interactive environments:

```sh
npm create sketchicon@latest -- --packs lucide,hugeicons --yes
```

The initializer installs the lightweight `sketchicon` React runtime plus only the selected geometry packages:

- `@sketchicon/lucide`
- `@sketchicon/hugeicons`

Manual installation also works:

```sh
npm install sketchicon @sketchicon/lucide
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

Named provider imports are also available:

```tsx
import { Search } from "@sketchicon/lucide";
import { Home01Icon } from "@sketchicon/hugeicons";
```

Direct per-icon imports are recommended because they keep native ESM startup work small.

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
npm create sketchicon@latest -- --migrate
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
| `sketchicon` | Lightweight React component and compatibility subpaths |
| `@sketchicon/lucide` | Generated Lucide geometry |
| `@sketchicon/hugeicons` | Generated Hugeicons Core Free geometry |
| `create-sketchicon` | Interactive installer and 0.1 migration tool |

The website remains a unified searchable catalog even though npm distribution is modular.

## Development

This repository uses npm workspaces and Node.js 22.22.0 or newer. Published packages support Node.js 20.11.1 or newer.

```sh
npm install
npm run check
npm run dev
```

`npm run generate` rebuilds both provider packages, compatibility reports, and the unified website catalog. Filled or otherwise incompatible icons are excluded rather than silently rendered incorrectly.

Rendering output is stable within a package version. The renderer does not use Canvas, the browser DOM, or `Math.random()`.
