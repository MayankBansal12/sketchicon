import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const requested = process.argv[2]?.replace(/^v/, "");

if (!requested || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(requested)) {
  throw new Error("Pass the exact published SketchIcon version, for example 0.2.0.");
}

const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-registry-installer-"));
const workspaceManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

async function installedManifest(packagePath) {
  return JSON.parse(await readFile(
    path.join(temporaryRoot, "node_modules", ...packagePath.split("/"), "package.json"),
    "utf8",
  ));
}

try {
  await writeFile(path.join(temporaryRoot, "package.json"), `${JSON.stringify({
    name: "sketchicon-public-registry-smoke",
    private: true,
    type: "module",
    dependencies: {
      react: workspaceManifest.devDependencies.react,
      "react-dom": workspaceManifest.devDependencies["react-dom"],
    },
  }, null, 2)}\n`);
  await exec(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: temporaryRoot,
  });

  const { stdout } = await exec(npx, [
    "--yes",
    `sketchicon@${requested}`,
    "--all",
    "--package-manager",
    "npm",
  ], { cwd: temporaryRoot, maxBuffer: 20 * 1024 * 1024 });
  assert.match(stdout, /Icon packs: lucide, hugeicons/);
  assert.match(stdout, /SketchIcon is ready/);

  for (const packageName of [
    "sketchicon",
    "@sketchicon/core",
    "@sketchicon/lucide",
    "@sketchicon/hugeicons",
  ]) {
    assert.equal(
      (await installedManifest(packageName)).version,
      requested,
      `${packageName} did not install at ${requested}.`,
    );
  }

  await mkdir(path.join(temporaryRoot, "smoke"));
  const smokeFile = path.join(temporaryRoot, "smoke", "render.mjs");
  await writeFile(smokeFile, [
    'import { createElement } from "react";',
    'import { renderToStaticMarkup } from "react-dom/server";',
    'import Search from "@sketchicon/lucide/icons/search";',
    'import Home from "@sketchicon/hugeicons/icons/home-01";',
    'import { SketchIcon } from "sketchicon/server";',
    "for (const icon of [Search, Home]) {",
    "  const html = renderToStaticMarkup(createElement(SketchIcon, { icon }));",
    "  if (!html.startsWith('<svg')) process.exit(1);",
    "}",
    "",
  ].join("\n"));
  await exec(process.execPath, [smokeFile], { cwd: temporaryRoot });

  const bin = path.join(temporaryRoot, "node_modules", ".bin", "sketchicon");
  const { stdout: help } = await exec(bin, ["--help"], { cwd: temporaryRoot });
  assert.match(help, new RegExp(`sketchicon@${requested}`));

  console.log(`Verified public npx installation and rendering for SketchIcon ${requested}.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
