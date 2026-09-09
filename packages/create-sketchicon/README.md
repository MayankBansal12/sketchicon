# create-sketchicon

Interactive installer and migration tool for SketchIcon.

The primary command is now:

```sh
npx sketchicon@latest
```

This package remains available as a backward-compatible alias.

```sh
npx create-sketchicon@latest
```

```sh
npx --yes create-sketchicon@latest --framework vue --lucide
npx create-sketchicon@latest --cwd apps/web
npx --yes create-sketchicon@latest --packs lucide,hugeicons
npx create-sketchicon@latest --hugeicons
npx create-sketchicon@latest --migrate
npx create-sketchicon@latest --migrate --dry-run
```

It detects React, Vue/Nuxt, and Angular only from direct `dependencies`,
`devDependencies`, `optionalDependencies`, and `peerDependencies` in the
target `package.json`. Multiple frameworks produce an evidence list and require
`--cwd` or `--framework`; missing frameworks are prompted interactively and
require `--framework react|vue|angular` in non-interactive use. React projects
install `sketchicon`; Vue projects install `@sketchicon/vue`. Angular is
recognized but its adapter is not available yet.

The command detects npm, pnpm, Yarn, or Bun and updates dependencies through that package manager so its lockfile remains authoritative.

Projects declaring `sketchicon` `0.1.x` are detected and migrated automatically. Dry runs print the dependency command and source-level import changes without writing anything.

Migration preserves the provider of every existing icon. Selecting Hugeicons for a project with old Lucide imports installs both packages; replace those Lucide icons manually before removing `@sketchicon/lucide`. Existing provider dependencies are reported but are not removed automatically.
