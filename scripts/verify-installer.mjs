import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-installer-"));
const archiveRoot = path.join(temporaryRoot, "archives");
const launcherRoot = path.join(temporaryRoot, "launchers");
const fakeBinRoot = path.join(temporaryRoot, "bin");
const installLog = path.join(temporaryRoot, "install-log.jsonl");
const originalPath = process.env.PATH ?? "";
const realNpmCli = process.env.npm_execpath;
let registryServer;

if (!realNpmCli) {
  throw new Error("verify-installer must run through npm so the real npm CLI can be isolated.");
}

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

async function unpack(name, archive) {
  const destination = path.join(launcherRoot, name);
  await mkdir(destination, { recursive: true });
  await exec("tar", ["-xzf", archive, "-C", destination]);
  return path.join(destination, "package", "dist", "cli.js");
}

async function writeNpmProxy() {
  await mkdir(fakeBinRoot, { recursive: true });
  const proxy = path.join(fakeBinRoot, "npm");
  await writeFile(proxy, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const archives = JSON.parse(process.env.SKETCHICON_LOCAL_ARCHIVES ?? "{}");
const originalArgs = process.argv.slice(2);
const args = originalArgs.map((argument) => archives[argument] ?? argument);
appendFileSync(process.env.SKETCHICON_INSTALL_LOG, JSON.stringify(originalArgs) + "\\n");
const result = spawnSync(
  process.execPath,
  [process.env.SKETCHICON_REAL_NPM_CLI, ...args],
  {
    env: { ...process.env, PATH: process.env.SKETCHICON_ORIGINAL_PATH },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
`);
  await chmod(proxy, 0o755);
}

async function prepareReactApp(name) {
  const directory = path.join(temporaryRoot, name);
  await mkdir(directory);
  await writeFile(path.join(directory, "package.json"), `${JSON.stringify({
    name: `sketchicon-${name}`,
    private: true,
    type: "module",
    dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
  }, null, 2)}\n`);
  await exec(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: directory,
  });
  return directory;
}

async function startCoreRegistry(archive, version) {
  const tarball = await readFile(archive);
  const shasum = createHash("sha1").update(tarball).digest("hex");
  registryServer = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    if (pathname === "/@sketchicon/core") {
      const address = registryServer.address();
      const port = typeof address === "object" && address ? address.port : 0;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        name: "@sketchicon/core",
        versions: {
          [version]: {
            name: "@sketchicon/core",
            version,
            dependencies: { "svg-pathdata": "^7.2.0" },
            dist: {
              shasum,
              tarball: `http://127.0.0.1:${port}/core.tgz`,
            },
          },
        },
        "dist-tags": { latest: version },
      }));
      return;
    }
    if (pathname === "/core.tgz") {
      response.setHeader("content-type", "application/octet-stream");
      response.end(tarball);
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not_found" }));
  });
  await new Promise((resolve, reject) => {
    registryServer.once("error", reject);
    registryServer.listen(0, "127.0.0.1", resolve);
  });
  const address = registryServer.address();
  if (!address || typeof address === "string") throw new Error("Local registry did not bind a port.");
  return `http://127.0.0.1:${address.port}`;
}

async function configureScopedRegistry(directory, registry) {
  await writeFile(path.join(directory, ".npmrc"), [
    `@sketchicon:registry=${registry}`,
    "audit=false",
    "fund=false",
    "",
  ].join("\n"));
}

async function runInstaller(cli, args, cwd, archives) {
  return exec(process.execPath, [cli, ...args], {
    cwd,
    env: {
      ...process.env,
      PATH: `${fakeBinRoot}${path.delimiter}${originalPath}`,
      SKETCHICON_INSTALL_LOG: installLog,
      SKETCHICON_LOCAL_ARCHIVES: JSON.stringify(archives),
      SKETCHICON_ORIGINAL_PATH: originalPath,
      SKETCHICON_REAL_NPM_CLI: realNpmCli,
    },
    maxBuffer: 16 * 1024 * 1024,
  });
}

async function installedManifest(directory, packagePath) {
  return JSON.parse(await readFile(
    path.join(directory, "node_modules", ...packagePath.split("/"), "package.json"),
    "utf8",
  ));
}

try {
  await mkdir(archiveRoot);
  await mkdir(launcherRoot);
  await writeNpmProxy();

  const archives = {
    core: await pack("@sketchicon/core"),
    runtime: await pack("sketchicon"),
    lucide: await pack("@sketchicon/lucide"),
    hugeicons: await pack("@sketchicon/hugeicons"),
    create: await pack("create-sketchicon"),
  };
  const runtimeManifest = JSON.parse(await readFile(
    path.join(root, "packages", "runtime", "package.json"),
    "utf8",
  ));
  const version = runtimeManifest.version;
  const registry = await startCoreRegistry(archives.core, version);
  const localArchives = {
    [`sketchicon@${version}`]: archives.runtime,
    [`@sketchicon/lucide@${version}`]: archives.lucide,
    [`@sketchicon/hugeicons@${version}`]: archives.hugeicons,
  };
  const sketchiconCli = await unpack("sketchicon", archives.runtime);
  const createCli = await unpack("create-sketchicon", archives.create);

  const runtimeOnlyApp = await prepareReactApp("runtime-only-app");
  await configureScopedRegistry(runtimeOnlyApp, registry);
  await exec(npm, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    archives.runtime,
  ], { cwd: runtimeOnlyApp });
  assert.equal((await installedManifest(runtimeOnlyApp, "sketchicon")).version, version);
  assert.equal((await installedManifest(runtimeOnlyApp, "@sketchicon/core")).version, version);
  for (const provider of ["lucide", "hugeicons"]) {
    await assert.rejects(readFile(path.join(
      runtimeOnlyApp,
      "node_modules",
      "@sketchicon",
      provider,
      "package.json",
    )));
  }
  const { stdout: npxHelp } = await exec(npx, [
    "--yes",
    "--offline",
    "sketchicon",
    "--help",
  ], { cwd: runtimeOnlyApp });
  assert.match(npxHelp, new RegExp(`npx sketchicon@${version}`));
  await exec(process.execPath, ["--input-type=module", "--eval", [
    'import { createElement } from "react";',
    'import { renderToStaticMarkup } from "react-dom/server";',
    'import { SketchIcon } from "sketchicon/server";',
    "const icon = { primitives: [{ type: 'line', x1: 0, y1: 0, x2: 24, y2: 24 }] };",
    "const html = renderToStaticMarkup(createElement(SketchIcon, { icon }));",
    'if (!html.startsWith("<svg")) process.exit(1);',
  ].join("\n")], { cwd: runtimeOnlyApp });

  const freshApp = await prepareReactApp("fresh-app");
  await configureScopedRegistry(freshApp, registry);
  const freshResult = await runInstaller(
    sketchiconCli,
    ["--yes", "--package-manager", "npm"],
    freshApp,
    localArchives,
  );
  assert.match(freshResult.stdout, /Icon packs: lucide/);
  assert.match(freshResult.stdout, /SketchIcon is ready/);
  assert.equal((await installedManifest(freshApp, "sketchicon")).version, version);
  assert.equal((await installedManifest(freshApp, "@sketchicon/lucide")).version, version);
  await assert.rejects(readFile(path.join(
    freshApp,
    "node_modules",
    "@sketchicon",
    "hugeicons",
    "package.json",
  )));
  await exec(process.execPath, ["--input-type=module", "--eval", [
    'import Search from "@sketchicon/lucide/icons/search";',
    'import { SketchIcon } from "sketchicon";',
    'if (!Search.primitives.length || !SketchIcon) process.exit(1);',
  ].join("\n")], { cwd: freshApp });

  const existingLucideApp = await prepareReactApp("existing-lucide-app");
  await configureScopedRegistry(existingLucideApp, registry);
  const existingLucideManifestPath = path.join(existingLucideApp, "package.json");
  const existingLucideManifest = JSON.parse(await readFile(existingLucideManifestPath, "utf8"));
  existingLucideManifest.dependencies["@sketchicon/lucide"] = "^0.2.0-beta.3";
  await writeFile(
    existingLucideManifestPath,
    `${JSON.stringify(existingLucideManifest, null, 2)}\n`,
  );
  const existingLucideResult = await runInstaller(
    sketchiconCli,
    ["--yes", "--package-manager", "npm"],
    existingLucideApp,
    localArchives,
  );
  assert.match(existingLucideResult.stdout, /Icon packs: lucide/);
  assert.equal((await installedManifest(existingLucideApp, "sketchicon")).version, version);
  assert.equal((await installedManifest(existingLucideApp, "@sketchicon/lucide")).version, version);
  await assert.rejects(readFile(path.join(
    existingLucideApp,
    "node_modules",
    "@sketchicon",
    "hugeicons",
    "package.json",
  )));

  const existingPackApp = await prepareReactApp("existing-pack-app");
  await configureScopedRegistry(existingPackApp, registry);
  const existingManifestPath = path.join(existingPackApp, "package.json");
  const existingManifest = JSON.parse(await readFile(existingManifestPath, "utf8"));
  existingManifest.dependencies["@sketchicon/hugeicons"] = "^0.2.0-beta.3";
  await writeFile(existingManifestPath, `${JSON.stringify(existingManifest, null, 2)}\n`);
  const existingResult = await runInstaller(
    sketchiconCli,
    ["--yes", "--package-manager", "npm"],
    existingPackApp,
    localArchives,
  );
  assert.match(existingResult.stdout, /Icon packs: hugeicons/);
  assert.equal((await installedManifest(existingPackApp, "sketchicon")).version, version);
  assert.equal((await installedManifest(existingPackApp, "@sketchicon/hugeicons")).version, version);
  await assert.rejects(readFile(path.join(
    existingPackApp,
    "node_modules",
    "@sketchicon",
    "lucide",
    "package.json",
  )));
  await exec(process.execPath, ["--input-type=module", "--eval", [
    'import Home from "@sketchicon/hugeicons/icons/home-01";',
    'if (!Home.primitives.length) process.exit(1);',
  ].join("\n")], { cwd: existingPackApp });

  const legacyApp = await prepareReactApp("legacy-app");
  await configureScopedRegistry(legacyApp, registry);
  const legacyManifestPath = path.join(legacyApp, "package.json");
  const legacyManifest = JSON.parse(await readFile(legacyManifestPath, "utf8"));
  legacyManifest.dependencies.sketchicon = "^0.1.5";
  await writeFile(legacyManifestPath, `${JSON.stringify(legacyManifest, null, 2)}\n`);
  const legacySourcePath = path.join(legacyApp, "App.tsx");
  await writeFile(legacySourcePath, [
    'import { Search, SketchIcon } from "sketchicon";',
    'import Check from "sketchicon/icons/check";',
    "",
    "export function App() {",
    "  return <><SketchIcon icon={Search} /><SketchIcon icon={Check} /></>;",
    "}",
    "",
  ].join("\n"));
  const legacyResult = await runInstaller(
    createCli,
    ["--hugeicons", "--package-manager", "npm"],
    legacyApp,
    localArchives,
  );
  assert.match(legacyResult.stdout, /SketchIcon 0\.1 detected/);
  assert.match(legacyResult.stdout, /Icon packs: hugeicons, lucide/);
  assert.match(legacyResult.stdout, /Required by migration: lucide/);
  assert.equal((await installedManifest(legacyApp, "sketchicon")).version, version);
  assert.equal((await installedManifest(legacyApp, "@sketchicon/lucide")).version, version);
  assert.equal((await installedManifest(legacyApp, "@sketchicon/hugeicons")).version, version);
  const migratedSource = await readFile(legacySourcePath, "utf8");
  assert.match(migratedSource, /import \{ Search \} from "@sketchicon\/lucide"/);
  assert.match(migratedSource, /import \{ SketchIcon \} from "sketchicon"/);
  assert.match(migratedSource, /from "@sketchicon\/lucide\/icons\/check"/);

  const installCommands = (await readFile(installLog, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.deepEqual(installCommands, [
    ["install", `sketchicon@${version}`, `@sketchicon/lucide@${version}`],
    ["install", `sketchicon@${version}`, `@sketchicon/lucide@${version}`],
    ["install", `sketchicon@${version}`, `@sketchicon/hugeicons@${version}`],
    [
      "install",
      `sketchicon@${version}`,
      `@sketchicon/hugeicons@${version}`,
      `@sketchicon/lucide@${version}`,
    ],
  ]);

  console.log(
    "Verified runtime-only npm/npx use and packed installers in fresh, existing-pack, and legacy apps.",
  );
} finally {
  if (registryServer) {
    await new Promise((resolve) => registryServer.close(resolve));
  }
  await rm(temporaryRoot, { recursive: true, force: true });
}
