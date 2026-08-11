# Migrating from SketchIcon 0.1

SketchIcon 0.2 keeps the React runtime and renderer API stable, but moves Lucide geometry into `@sketchicon/lucide`.

```sh
npm create sketchicon@latest -- --migrate
```

Preview changes with `--dry-run`.

```diff
-import { Search, SketchIcon } from "sketchicon";
+import { Search } from "@sketchicon/lucide";
+import { SketchIcon } from "sketchicon";

-import Search from "sketchicon/icons/search";
+import Search from "@sketchicon/lucide/icons/search";
```

`SketchIcon`, its props and defaults, custom geometry, `sketchicon/runtime`, and `sketchicon/core` remain compatible.
