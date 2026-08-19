# @sketchicon/lucide

Generated Lucide geometry for the [`sketchicon`](https://www.npmjs.com/package/sketchicon) deterministic hand-drawn React renderer.

```sh
npm install sketchicon@latest @sketchicon/lucide@latest
```

```tsx
import Search from "@sketchicon/lucide/icons/search";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Search} aria-label="Search" />;
```

Direct subpath imports are recommended for native ESM, SSR, tests, CLIs, and
serverless cold starts. Modern application bundlers can also use the convenient,
tree-shakable barrel form: `import { Search } from "@sketchicon/lucide"`.
