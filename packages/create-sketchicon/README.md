# create-sketchicon

Interactive installer and migration tool for SketchIcon.

```sh
npm create sketchicon@latest
```

```sh
npm create sketchicon@latest -- --packs lucide,hugeicons --yes
npm create sketchicon@latest -- --migrate
npm create sketchicon@latest -- --migrate --dry-run
```

The command detects npm, pnpm, Yarn, or Bun and updates dependencies through that package manager so its lockfile remains authoritative.

Projects declaring `sketchicon` `0.1.x` are detected and migrated automatically. Dry runs print the dependency command and source-level import changes without writing anything.

Migration preserves the provider of every existing icon. Selecting Hugeicons for a project with old Lucide imports installs both packages; replace those Lucide icons manually before removing `@sketchicon/lucide`. Existing provider dependencies are reported but are not removed automatically.
