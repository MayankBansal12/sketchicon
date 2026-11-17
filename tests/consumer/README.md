# CLI consumer tests

Run from the repository root:

```sh
npm ci
npx playwright install --with-deps chromium --only-shell
npm run build:consumer-packages
npm run test:consumer
```

The CI `consumer` job runs these checks on pushes to main and pull requests.
The runner builds four fresh consumers: Vite and Next.js App Router, each with
Lucide only and Hugeicons only. Fixtures live outside the workspace so workspace
links and source aliases cannot hide packaging errors.

For each consumer it runs real `npx sketchicon`, verifies installed versions and
absence of the other pack, repeats installation, typechecks public imports,
production-builds, and opens the app in Chromium. Assertions check SVG paths,
visibility, a client state update, and browser errors. Next.js additionally checks
server HTML and both server and client icon entry points. One scenario also
checks help, dry-run (`--all` and `--yes`), invalid packs, and missing flags in a
non-interactive process, including exit codes and unchanged project manifests.

A temporary HTTP registry serves the checkout's `npm pack` artifacts, including
the CLI and transitive core dependency. Unknown SketchIcon packages fail instead
of falling back to npm. Other dependencies still come from public npm; direct
fixture dependencies use exact versions (Next matches `verify-frameworks.mjs`).
Transitive fixture dependencies are resolved at runtime, so registry outages or
upstream dependency changes can still fail this job. Each scenario has its own
npm cache. The runner has command/readiness timeouts and cleans up its servers,
browser, and temporary directories even on failure.

This is a targeted compatibility check, not exhaustive coverage of every icon,
framework version, browser, OS, package manager, or interactive terminal flow.
Existing unit, catalog, installer, and framework checks remain complementary.
`verify:registry` in the publish workflow separately tests the actual public
release; this suite cannot prove publication succeeded.
