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
require `--framework react|vue|preact|vanilla|next|react-native|expo` in non-interactive use. React projects
install `sketchicon`; Vue projects install `@sketchicon/vue`. Angular is
recognized but its adapter is not available yet.

The command detects npm, pnpm, Yarn, or Bun and updates dependencies through that package manager so its lockfile remains authoritative.

Projects declaring `sketchicon` `0.1.x` are detected and migrated automatically. Dry runs print the dependency command and source-level import changes without writing anything.

Migration preserves the provider of every existing icon. Selecting Hugeicons for a project with old Lucide imports installs both packages; replace those Lucide icons manually before removing `@sketchicon/lucide`. Existing provider dependencies are reported but are not removed automatically.

## Framework selection

```sh
npx sketchicon@latest --framework preact --lucide
npx sketchicon@latest --framework vanilla --hugeicons
```

`--framework` accepts `react`, `vue`, `preact`, `vanilla`, `next`, `react-native`, or `expo`. It selects `sketchicon`, `@sketchicon/preact`, or `@sketchicon/dom` respectively, plus your chosen packs. The compatibility `create-sketchicon` command accepts the same flags. Existing dependencies are retained; this does not convert components between frameworks. Migrate a 0.1 project with `--framework react` first.

## Framework-aware installation

Run `npx sketchicon@latest --yes` in an existing app. Direct dependencies identify React, Next.js, Vue/Nuxt, Preact, React Native, or Expo. Next.js and native projects take precedence over their React dependency; Expo takes precedence over React Native. Mixed frameworks require an explicit choice.

Use `--framework react|vue|preact|vanilla|next|react-native|expo` to override detection and `--cwd apps/my-app` to target a workspace. Plain JavaScript projects use `--framework vanilla`. `--dry-run` previews all commands without changing files.

Vue installs `@sketchicon/vue`, Preact installs `@sketchicon/preact`, and vanilla installs `@sketchicon/dom`, without React. React, Next.js, and native apps share `sketchicon`. All use the same separately selected geometry packs. Next.js Server Components can import `sketchicon/server`. Native and Expo apps import `sketchicon/native`; bare React Native installs `react-native-svg` and requires a native rebuild (and pods on iOS). Expo runs `expo install react-native-svg` with the selected package manager to match the SDK.

Angular is detected with an actionable unsupported-adapter error. No dedicated Angular or Svelte component adapter is shipped.
