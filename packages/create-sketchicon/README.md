# create-sketchicon

Interactive installer and migration tool for SketchIcon.

The primary command is now:

```sh
npx sketchicon@beta
```

This package remains available as a backward-compatible alias.

```sh
npx create-sketchicon@beta
```

```sh
npx --yes create-sketchicon@beta --packs lucide,hugeicons
npx create-sketchicon@beta --hugeicons
npx create-sketchicon@beta --migrate
npx create-sketchicon@beta --migrate --dry-run
```

The command detects npm, pnpm, Yarn, or Bun and updates dependencies through that package manager so its lockfile remains authoritative.

Projects declaring `sketchicon` `0.1.x` are detected and migrated automatically. Dry runs print the dependency command and source-level import changes without writing anything.

Migration preserves the provider of every existing icon. Selecting Hugeicons for a project with old Lucide imports installs both packages; replace those Lucide icons manually before removing `@sketchicon/lucide`. Existing provider dependencies are reported but are not removed automatically.
