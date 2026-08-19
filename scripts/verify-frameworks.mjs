import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-frameworks-"));
const archiveRoot = path.join(temporaryRoot, "archives");
const workspaceManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const webManifest = JSON.parse(await readFile(path.join(root, "apps", "web", "package.json"), "utf8"));
const reactVersion = workspaceManifest.devDependencies.react;
const reactDomVersion = workspaceManifest.devDependencies["react-dom"];
const viteVersion = workspaceManifest.devDependencies.vite;
const reactRouterVersion = webManifest.dependencies["react-router"];
const nextVersion = "16.3.1";

async function pack(workspace) {
  const { stdout } = await exec(
    npm,
    ["pack", "--workspace", workspace, "--json", "--pack-destination", archiveRoot],
    { cwd: root, maxBuffer: 40 * 1024 * 1024 },
  );
  const [report] = JSON.parse(stdout);
  if (!report?.filename) throw new Error(`npm pack did not return an archive for ${workspace}.`);
  return path.join(archiveRoot, report.filename);
}

async function createApp(name, dependencies) {
  const directory = path.join(temporaryRoot, name);
  await mkdir(directory);
  await writeFile(path.join(directory, "package.json"), `${JSON.stringify({
    name: `sketchicon-${name}`,
    private: true,
    type: "module",
  }, null, 2)}\n`);
  await exec(npm, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...dependencies,
  ], { cwd: directory, maxBuffer: 20 * 1024 * 1024 });
  return directory;
}

async function write(directory, relativePath, source) {
  const target = path.join(directory, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, source);
}

async function verifyVite(archives) {
  const directory = await createApp("vite-app", [
    archives.core,
    archives.runtime,
    archives.lucide,
    archives.hugeicons,
    `react@${reactVersion}`,
    `react-dom@${reactDomVersion}`,
    `vite@${viteVersion}`,
  ]);
  await write(directory, "index.html", [
    '<div id="root"></div>',
    '<script type="module" src="/src/main.jsx"></script>',
    "",
  ].join("\n"));
  await write(directory, "src/main.jsx", [
    'import { createElement } from "react";',
    'import { createRoot } from "react-dom/client";',
    'import Search from "@sketchicon/lucide/icons/search";',
    'import Home from "@sketchicon/hugeicons/icons/home-01";',
    'import { SketchIcon } from "sketchicon";',
    "",
    "const app = createElement('main', null,",
    "  createElement(SketchIcon, { icon: Search, 'aria-label': 'Search' }),",
    "  createElement(SketchIcon, { icon: Home, 'aria-label': 'Home' }),",
    ");",
    "createRoot(document.getElementById('root')).render(app);",
    "",
  ].join("\n"));
  await exec(path.join(directory, "node_modules", ".bin", "vite"), ["build"], {
    cwd: directory,
  });
  const assets = await readdir(path.join(directory, "dist", "assets"));
  assert.ok(assets.some((file) => file.endsWith(".js")), "Vite did not emit JavaScript.");
}

async function verifyReactRouter(archives) {
  const directory = await createApp("react-router-app", [
    archives.core,
    archives.runtime,
    archives.lucide,
    `react@${reactVersion}`,
    `react-dom@${reactDomVersion}`,
    `vite@${viteVersion}`,
    `react-router@${reactRouterVersion}`,
    `@react-router/node@${reactRouterVersion}`,
    `@react-router/dev@${reactRouterVersion}`,
  ]);
  await write(directory, "vite.config.js", [
    'import { reactRouter } from "@react-router/dev/vite";',
    'import { defineConfig } from "vite";',
    "export default defineConfig({ plugins: [reactRouter()] });",
    "",
  ].join("\n"));
  await write(directory, "app/routes.js", "export default [];\n");
  await write(directory, "app/root.jsx", [
    'import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";',
    'import Search from "@sketchicon/lucide/icons/search";',
    'import { SketchIcon } from "sketchicon";',
    "",
    "export function Layout({ children }) {",
    "  return <html lang=\"en\"><head><Meta /><Links /></head><body>{children}<ScrollRestoration /><Scripts /></body></html>;",
    "}",
    "",
    "export default function App() {",
    "  return <main><SketchIcon icon={Search} aria-label=\"Search\" /><Outlet /></main>;",
    "}",
    "",
  ].join("\n"));
  await exec(path.join(directory, "node_modules", ".bin", "react-router"), ["build"], {
    cwd: directory,
    maxBuffer: 20 * 1024 * 1024,
  });
  await access(path.join(directory, "build", "client"));
  await access(path.join(directory, "build", "server"));
}

async function verifyNext(archives) {
  const directory = await createApp("next-app", [
    archives.core,
    archives.runtime,
    archives.lucide,
    archives.hugeicons,
    `react@${reactVersion}`,
    `react-dom@${reactDomVersion}`,
    `next@${nextVersion}`,
  ]);
  await write(directory, "app/layout.jsx", [
    "export default function RootLayout({ children }) {",
    "  return <html lang=\"en\"><body>{children}</body></html>;",
    "}",
    "",
  ].join("\n"));
  await write(directory, "app/client-icon.jsx", [
    '"use client";',
    'import Home from "@sketchicon/hugeicons/icons/home-01";',
    'import { SketchIcon } from "sketchicon";',
    "export function ClientIcon() {",
    "  return <SketchIcon icon={Home} aria-label=\"Home\" />;",
    "}",
    "",
  ].join("\n"));
  await write(directory, "app/page.jsx", [
    'import Search from "@sketchicon/lucide/icons/search";',
    'import { SketchIcon } from "sketchicon/server";',
    'import { ClientIcon } from "./client-icon";',
    "export default function Page() {",
    "  return <main><SketchIcon icon={Search} title=\"Search\" /><ClientIcon /></main>;",
    "}",
    "",
  ].join("\n"));
  await exec(path.join(directory, "node_modules", ".bin", "next"), ["build"], {
    cwd: directory,
    env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
    maxBuffer: 30 * 1024 * 1024,
  });
  await access(path.join(directory, ".next", "BUILD_ID"));
}

try {
  await mkdir(archiveRoot);
  const archives = {
    core: await pack("@sketchicon/core"),
    runtime: await pack("sketchicon"),
    lucide: await pack("@sketchicon/lucide"),
    hugeicons: await pack("@sketchicon/hugeicons"),
  };
  await verifyVite(archives);
  await verifyReactRouter(archives);
  await verifyNext(archives);
  console.log(
    `Verified packed packages in Vite ${viteVersion}, React Router ${reactRouterVersion}, and Next.js ${nextVersion} production builds.`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
