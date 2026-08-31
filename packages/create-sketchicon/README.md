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
npx --yes create-sketchicon@latest --packs lucide,hugeicons
npx create-sketchicon@latest --hugeicons
npx create-sketchicon@latest --migrate
npx create-sketchicon@latest --migrate --dry-run
```

The command detects npm, pnpm, Yarn, or Bun and updates dependencies through that package manager so its lockfile remains authoritative.

Projects declaring `sketchicon` `0.1.x` are detected and migrated automatically. Dry runs print the dependency command and source-level import changes without writing anything.

Migration preserves the provider of every existing icon. Selecting Hugeicons for a project with old Lucide imports installs both packages; replace those Lucide icons manually before removing `@sketchicon/lucide`. Existing provider dependencies are reported but are not removed automatically.

## Installer telemetry

After a successful, non-dry-run installation, the initializer sends one anonymous
event containing the selected icon packs, initializer version, whether source files
were migrated, and a client timestamp used for freshness and replay protection. The
receiver stores only the pack names, version, migration result, and UTC date. It does
not receive project paths, package manifests, source code, usernames, or a persistent
identifier.

Telemetry is disabled when `CI`, `DO_NOT_TRACK`, or
`SKETCHICON_NO_TELEMETRY` is set to a truthy value. Disable it for an individual run
with `--no-telemetry`.
