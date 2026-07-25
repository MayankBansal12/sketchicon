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

if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
  throw new Error(`Public package must be self-contained; found dependencies: ${Object.keys(manifest.dependencies).join(", ")}`);
}

const requiredFiles = ["index.js", "index.d.ts", "runtime.js", "runtime.d.ts", "core.js", "core.d.ts"];
for (const file of requiredFiles) {
  await readFile(path.join(distRoot, file));
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
  if (source.includes("@sketchicon/")) {
    throw new Error(`Internal workspace import leaked into ${path.relative(packageRoot, file)}`);
  }
}

console.log("Verified self-contained sketchicon package output.");
