# SketchIcon release verification

SketchIcon tests the packages consumers receive, not only the TypeScript source in
the workspace. Release verification is split into layers so failures identify the
broken contract.

## Test layers

| Command | Contract |
| --- | --- |
| `npm test` | Renderer, React component, catalog, installer parsing, package-manager detection, and migration units |
| `npm run verify:package` | Export maps, client/server boundaries, executable bins, declarations, and dependency isolation |
| `npm run verify:distribution` | Packed file counts, package sizes, direct-import startup, and provider-barrel startup |
| `npm run verify:installer` | Packed runtime and initializer behavior in isolated React apps using real npm subprocesses |
| `npm run verify:consumer` | Packed-package TypeScript, NodeNext, bundler resolution, React 18/19, SSR, RSC, and provider isolation |
| `npm run verify:bundle` | Vite tree-shaking and bundle-size budgets for barrel and direct imports |
| `npm run verify:frameworks` | Production builds from packed tarballs in Vite, React Router framework mode, and Next.js App Router |
| `npm run verify:native` | Packed-package native TypeScript, real `react-native-svg` component rendering with the React Native Jest preset, and Expo Metro production exports for Android, iOS, and web |
| `npm run verify:web` | The production catalog website, lazy chunks, documentation, and catalog completeness |
| `npm run verify:registry -- <version>` | The literal public `npx sketchicon@<version>` flow after npm publication |

`npm run check` runs every pre-publication layer. The publish workflow runs the
public registry smoke after all packages for the tagged version are available.

## Installer scenarios

`verify:installer` covers:

- `npm install sketchicon` as a runtime-only installation. It installs
  `@sketchicon/core`, exposes the `sketchicon` bin, renders custom geometry, and
  does not install an icon provider.
- A fresh React app using `--yes`. Lucide is selected as the default pack.
- An app already declaring `@sketchicon/lucide`. Lucide is retained without
  adding Hugeicons.
- An app already declaring `@sketchicon/hugeicons`. Hugeicons is retained without
  adding Lucide.
- A SketchIcon 0.1.5 app with existing root and direct icon imports. Migration
  rewrites imports and retains the Lucide provider even when Hugeicons is also
  selected.

The migration case refers to SketchIcon `0.1.5`. SketchIcon does not rewrite
imports from unrelated packages such as `lucide-react` or `@hugeicons/react`.

## Installation contract

`npm install sketchicon` is intentionally valid, but provides only the React
runtime, custom geometry support, and the framework-independent renderer. A
catalog requires a provider:

```sh
npm install sketchicon @sketchicon/lucide
# or
npm install sketchicon @sketchicon/hugeicons
```

The initializer is the convenient path for selecting providers:

```sh
npx sketchicon@latest
```

## Native consumer coverage

`verify:native` copies `tests/native` into a temporary directory and installs npm
archives of the core, runtime, and both providers. The fixture pins Expo 57,
React Native 0.86, React 19.2, and react-native-svg 15.15, checking its dependency
versions against Expo's bundled compatibility manifest. No workspace source
aliases or SVG component mocks are used. React Native's Jest preset supplies the
native host mocks required to render in Node. The fixture's Jest configuration
allows Babel to transform the ESM packages `sketchicon`, `@sketchicon/*`, and
`svg-pathdata`, along with React Native and `react-native-svg`. Consumers using
Jest should include these in their `transformIgnorePatterns` allowlist too.

Checks cover geometry parity for both catalogs, deterministic options and
updates, SVG instance refs, native props, color and size overrides, and
accessibility defaults. Type checks accept native styles and callbacks and reject
DOM refs, CSS strings, DOM click handlers, and children. Metro exports exercise
the packed entry and provider subpaths for Android, iOS, and web.

These are JavaScript rendering and bundling checks, not device or simulator
launches. Native binary compilation and on-device screen-reader behavior still
require testing in a consumer's iOS/Android environment.
