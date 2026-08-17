# @sketchicon/hugeicons

Generated Hugeicons Core Free geometry for the [`sketchicon`](https://www.npmjs.com/package/sketchicon) deterministic hand-drawn React renderer.

```sh
npm install sketchicon @sketchicon/hugeicons
```

```tsx
import { Home01Icon } from "@sketchicon/hugeicons";
import { SketchIcon } from "sketchicon";

<SketchIcon icon={Home01Icon} aria-label="Home" />;
```

Named imports are the recommended default. Startup-sensitive Node.js environments can bypass the provider barrel with `import Home01Icon from "@sketchicon/hugeicons/icons/home-01"`.
