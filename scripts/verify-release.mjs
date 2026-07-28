import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.env.GITHUB_REF_NAME ?? process.argv[2];

if (!tag) {
  throw new Error("Pass a release tag or set GITHUB_REF_NAME (for example, v0.1.5).");
}

const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/.exec(tag);
if (!match) {
  throw new Error(`Release tag must be valid semver prefixed with v: ${tag}`);
}

const version = tag.slice(1);
const readManifest = async (directory) => JSON.parse(
  await readFile(path.join(root, "packages", directory, "package.json"), "utf8"),
);
const [core, sketchicon] = await Promise.all([
  readManifest("core"),
  readManifest("lucide"),
]);

if (core.version !== version) {
  throw new Error(`${core.name} version ${core.version} does not match tag ${tag}.`);
}

if (sketchicon.version !== version) {
  throw new Error(`${sketchicon.name} version ${sketchicon.version} does not match tag ${tag}.`);
}

if (sketchicon.dependencies?.[core.name] !== version) {
  throw new Error(`${sketchicon.name} must depend on ${core.name}@${version}.`);
}

console.log(`Verified release metadata for ${tag}.`);
