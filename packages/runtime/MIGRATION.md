# Migrating from SketchIcon 0.1

SketchIcon 0.2 keeps the React runtime and renderer API stable, but moves Lucide geometry into `@sketchicon/lucide`.

```sh
npx sketchicon@latest --migrate
```

Preview changes with `--dry-run`.

If the project declares `sketchicon` `0.1.x`, the regular initializer also detects it and enables migration automatically:

```sh
npx sketchicon@latest
```

```diff
-import { Search, SketchIcon } from "sketchicon";
+import { Search } from "@sketchicon/lucide";
+import { SketchIcon } from "sketchicon";

-import Search from "sketchicon/icons/search";
+import Search from "@sketchicon/lucide/icons/search";
```

`SketchIcon`, its props and defaults, custom geometry, `sketchicon/runtime`, and `sketchicon/core` remain compatible.

## Choosing providers

The `0.1` catalog contains Lucide icons, so migrated icon imports require `@sketchicon/lucide`. If you select only Hugeicons, the initializer installs both providers rather than leaving broken Lucide imports. It does not guess equivalent Hugeicons.

For a Hugeicons-only project:

1. Run the migration and select Hugeicons.
2. Replace the migrated Lucide icons with the Hugeicons you want.
3. Remove `@sketchicon/lucide` with your package manager.

Provider packages that were already installed are never removed automatically.
