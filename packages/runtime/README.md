# sketchicon

The lightweight React runtime for deterministic hand-drawn SVG geometry.

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

## Framework selection

```sh
npx sketchicon@latest --framework preact --lucide
npx sketchicon@latest --framework vanilla --hugeicons
```

`--framework` accepts `react` (default), `preact`, or `vanilla`. It selects `sketchicon`, `@sketchicon/preact`, or `@sketchicon/dom` respectively, plus your chosen packs. The compatibility `create-sketchicon` command accepts the same flags. Existing dependencies are retained; this does not convert components between frameworks. Migrate a 0.1 project with `--framework react` first.
