# sketchicon

The lightweight React runtime for deterministic hand-drawn SVG geometry.

Use the initializer to select optional catalogs:

```sh
npm create sketchicon@latest
```

Or install manually:

```sh
npm install sketchicon @sketchicon/lucide
```

```tsx
import Search from "@sketchicon/lucide/icons/search";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Search} aria-label="Search" />;
```

The `sketchicon/runtime` and `sketchicon/core` entry points remain available for compatibility.
