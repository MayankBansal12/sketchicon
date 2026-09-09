# sketchicon

The lightweight React runtime for deterministic hand-drawn SVG geometry.

Use the initializer to select optional catalogs:

```sh
npx sketchicon@latest
```

Use `--lucide`, `--hugeicons`, or `--all` for a non-interactive one-command setup.
`npx create-sketchicon@latest` remains available as a compatibility alias.

After a successful, non-dry-run installation, the initializer sends one anonymous
event containing the selected icon packs, initializer version, whether source files
were migrated, and a client timestamp used for freshness and replay protection. The
receiver stores only the pack names, version, migration result, and UTC date. It does
not receive project paths, package manifests, source code, usernames, or a persistent
identifier. Set `CI`, `DO_NOT_TRACK`, or `SKETCHICON_NO_TELEMETRY`, or pass
`--no-telemetry`, to disable the event.

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
