# @sketchicon/lucide

Generated Lucide geometry for the [`sketchicon`](https://www.npmjs.com/package/sketchicon) deterministic hand-drawn React renderer.

```sh
npm install sketchicon @sketchicon/lucide
```

```tsx
import { Search } from "@sketchicon/lucide";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Search} aria-label="Search" />;
```

Named imports are the recommended default. Startup-sensitive Node.js environments can bypass the provider barrel with `import Search from "@sketchicon/lucide/icons/search"`.
