import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readManifest = async (directory) => JSON.parse(
  await readFile(path.join(root, "packages", directory, "package.json"), "utf8"),
);
const manifests = Object.fromEntries(await Promise.all(
  ["core", "runtime", "lucide", "hugeicons", "create-sketchicon"].map(async (directory) => [directory, await readManifest(directory)]),
));
const version = manifests.core.version;

for (const [directory, manifest] of Object.entries(manifests)) {
  if (manifest.version !== version) {
    throw new Error(`${manifest.name} in ${directory} does not use the shared version ${version}.`);
  }
}

const expectedNames = {
  core: "@sketchicon/core",
  runtime: "sketchicon",
  lucide: "@sketchicon/lucide",
  hugeicons: "@sketchicon/hugeicons",
  "create-sketchicon": "create-sketchicon",
};
for (const [directory, name] of Object.entries(expectedNames)) {
  if (manifests[directory].name !== name) throw new Error(`Unexpected package identity in ${directory}.`);
}

const coreDependency = { "@sketchicon/core": version };
for (const directory of ["runtime", "lucide", "hugeicons"]) {
  if (JSON.stringify(manifests[directory].dependencies) !== JSON.stringify(coreDependency)) {
    throw new Error(`${manifests[directory].name} must depend only on @sketchicon/core@${version}.`);
  }
}

if (manifests.runtime.exports?.["./runtime"]?.import !== "./dist/runtime.js") {
  throw new Error("The sketchicon/runtime compatibility entry is missing.");
}
if (manifests.runtime.exports?.["./core"]?.import !== "./dist/core.js") {
  throw new Error("The sketchicon/core compatibility entry is missing.");
}
if (manifests.runtime.exports?.["./icons/*"] || manifests.runtime.dependencies?.["@sketchicon/lucide"]) {
  throw new Error("The lightweight runtime still includes or depends on Lucide.");
}

const requiredFiles = {
  runtime: ["index.js", "index.d.ts", "runtime.js", "runtime.d.ts", "core.js", "core.d.ts"],
  lucide: ["index.js", "index.d.ts", "icons/search.js", "icons/search.d.ts"],
  hugeicons: ["index.js", "index.d.ts", "icons/home-01.js", "icons/home-01.d.ts"],
  "create-sketchicon": ["cli.js", "cli.d.ts"],
};
for (const [directory, files] of Object.entries(requiredFiles)) {
  for (const file of files) await readFile(path.join(root, "packages", directory, "dist", file));
}

for (const entry of ["index.js", "runtime.js"]) {
  const runtime = await readFile(path.join(root, "packages", "runtime", "dist", entry), "utf8");
  if (!/^(?:#![^\n]+\n)?(["'])use client\1;/.test(runtime)) {
    throw new Error(`The sketchicon ${entry} build is missing its React client boundary.`);
  }
}

const cli = await readFile(path.join(root, "packages", "create-sketchicon", "dist", "cli.js"), "utf8");
if (!cli.startsWith("#!/usr/bin/env node")) throw new Error("create-sketchicon is missing its executable shebang.");

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }));
  return nested.flat();
}

for (const directory of ["runtime", "lucide", "hugeicons"]) {
  const distRoot = path.join(root, "packages", directory, "dist");
  for (const file of await files(distRoot)) {
    if (!/\.(?:js|d\.ts)$/.test(file)) continue;
    const source = await readFile(file, "utf8");
    if (source.includes("@hugeicons/core-free-icons") || source.includes("lucide-static")) {
      throw new Error(`Generation-only dependency leaked into ${path.relative(root, file)}.`);
    }
  }
}

const sizeLimits = { runtime: 200_000, lucide: 15_000_000, hugeicons: 35_000_000 };
for (const [directory, limit] of Object.entries(sizeLimits)) {
  const packageFiles = await files(path.join(root, "packages", directory, "dist"));
  const bytes = (await Promise.all(packageFiles.map(async (file) => (await stat(file)).size)))
    .reduce((total, size) => total + size, 0);
  if (bytes > limit) throw new Error(`${directory} dist is ${bytes} bytes; expected at most ${limit}.`);
}

console.log("Verified independent runtime, Lucide, Hugeicons, core, and initializer package outputs.");
