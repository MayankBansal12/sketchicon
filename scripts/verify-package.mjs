import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "packages", "lucide");
const distRoot = path.join(packageRoot, "dist");
const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

if (manifest.name !== "sketchicon" || manifest.version !== "0.1.0") {
  throw new Error(`Unexpected package identity: ${manifest.name}@${manifest.version}`);
}

const expectedDependencies = { "@sketchicon/core": manifest.version };
if (JSON.stringify(manifest.dependencies) !== JSON.stringify(expectedDependencies)) {
  throw new Error(`Unexpected package dependencies: ${JSON.stringify(manifest.dependencies)}`);
}

const requiredFiles = ["index.js", "index.d.ts", "runtime.js", "runtime.d.ts", "core.js", "core.d.ts"];
for (const file of requiredFiles) {
  await readFile(path.join(distRoot, file));
}

if (manifest.exports?.["./runtime"]?.import !== "./dist/runtime.js") {
  throw new Error("The lightweight sketchicon/runtime entry is not exported.");
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : [target];
  }));
  return files.flat();
}

for (const file of await sourceFiles(distRoot)) {
  if (!/\.(?:js|d\.ts)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (source.includes("@sketchicon/react")) {
    throw new Error(`Removed React package import leaked into ${path.relative(packageRoot, file)}`);
  }
  const unexpectedWorkspaceImport = source.match(/@sketchicon\/(?!core\b)[\w-]+/);
  if (unexpectedWorkspaceImport) {
    throw new Error(`Unexpected workspace import ${unexpectedWorkspaceImport[0]} in ${path.relative(packageRoot, file)}`);
  }
}

console.log("Verified sketchicon package output and core dependency.");
