import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exec = promisify(execFile);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tag = process.env.GITHUB_REF_NAME ?? process.argv[2];

if (!tag) throw new Error("Pass a release tag or set GITHUB_REF_NAME (for example, v0.2.0).");
if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/.test(tag)) {
  throw new Error(`Release tag must be valid semver prefixed with v: ${tag}`);
}

const version = tag.slice(1);
const directories = ["core", "runtime", "lucide", "hugeicons", "create-sketchicon"];
const manifests = await Promise.all(directories.map(async (directory) => JSON.parse(
  await readFile(path.join(root, "packages", directory, "package.json"), "utf8"),
)));

for (const manifest of manifests) {
  if (manifest.version !== version) throw new Error(`${manifest.name}@${manifest.version} does not match ${tag}.`);
}
for (const manifest of manifests.filter(({ name }) => ["sketchicon", "@sketchicon/lucide", "@sketchicon/hugeicons"].includes(name))) {
  if (manifest.dependencies?.["@sketchicon/core"] !== version) {
    throw new Error(`${manifest.name} must depend on @sketchicon/core@${version}.`);
  }
}

for (const manifest of manifests) {
  try {
    await exec(npm, ["view", `${manifest.name}@${version}`, "version", "--json"], {
      cwd: root,
    });
    throw new Error(`${manifest.name}@${version} is already published and cannot be replaced.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("is already published")) throw error;
    const stderr = typeof error === "object" && error !== null && "stderr" in error
      ? String(error.stderr)
      : "";
    if (!/E404|404 Not Found/.test(stderr)) {
      throw new Error(
        `Could not verify whether ${manifest.name}@${version} is unpublished: ${stderr || String(error)}`,
      );
    }
  }
}

console.log(`Verified release metadata and unpublished versions for ${manifests.length} packages at ${tag}.`);
