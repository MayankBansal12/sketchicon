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
