import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-consumer-"));

async function pack(workspace) {
  const { stdout } = await exec(
    "npm",
    ["pack", "--workspace", workspace, "--json", "--pack-destination", temporaryRoot],
    { cwd: root },
  );
  const [result] = JSON.parse(stdout);
  if (!result?.filename) throw new Error(`npm pack did not return an archive for ${workspace}.`);
  return path.join(temporaryRoot, result.filename);
}

try {
  const coreArchive = await pack("@sketchicon/core");
  const sketchiconArchive = await pack("sketchicon");
  const consumerRoot = path.join(temporaryRoot, "consumer");
  const typeScriptBin = path.join(root, "node_modules", "typescript", "bin", "tsc");

  await mkdir(consumerRoot);
  await writeFile(
    path.join(temporaryRoot, "package.json"),
    `${JSON.stringify({ private: true, workspaces: ["consumer"] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(temporaryRoot, "consumer", "package.json"),
    `${JSON.stringify({
      name: "sketchicon-consumer-fixture",
      private: true,
      type: "module",
      dependencies: {
        "@sketchicon/core": `file:${coreArchive}`,
        "@types/react": workspaceManifest.devDependencies["@types/react"],
        react: workspaceManifest.devDependencies.react,
        "react-dom": workspaceManifest.devDependencies["react-dom"],
        sketchicon: `file:${sketchiconArchive}`,
      },
    }, null, 2)}\n`,
  );
  await writeFile(
    path.join(temporaryRoot, "consumer", "tsconfig.json"),
    `${JSON.stringify({
      compilerOptions: {
        jsx: "react-jsx",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        strict: true,
        target: "ES2022",
      },
      include: ["consumer.tsx"],
    }, null, 2)}\n`,
  );
  await writeFile(
    path.join(temporaryRoot, "consumer", "consumer.tsx"),
    [
      'import { Search, SketchIcon } from "sketchicon";',
      'import { renderSketch } from "sketchicon/core";',
      'import SearchDirect from "sketchicon/icons/search";',
      'import { SketchIcon as RuntimeSketchIcon } from "sketchicon/runtime";',
      "",
      "renderSketch(SearchDirect);",
      "<SketchIcon icon={Search} title=\"Search\" />;",
      "<RuntimeSketchIcon icon={SearchDirect} />;",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(temporaryRoot, "consumer", "consumer.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import { createElement } from "react";',
      'import { renderToStaticMarkup } from "react-dom/server";',
      'import { Search, SketchIcon } from "sketchicon";',
      'import { renderSketch } from "sketchicon/core";',
      'import SearchDirect from "sketchicon/icons/search";',
      'import { SketchIcon as RuntimeSketchIcon } from "sketchicon/runtime";',
      "",
      "assert.deepEqual(SearchDirect, Search);",
      "assert.ok(renderSketch(Search).length > 0);",
      "assert.equal(RuntimeSketchIcon, SketchIcon);",
      'assert.match(renderToStaticMarkup(createElement(SketchIcon, { icon: Search })), /^<svg/);',
      "",
    ].join("\n"),
  );

  await exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: temporaryRoot,
  });
  await exec(process.execPath, [typeScriptBin, "-p", "tsconfig.json"], {
    cwd: consumerRoot,
  });
  await exec(process.execPath, ["consumer.mjs"], { cwd: consumerRoot });

  assert.ok(coreArchive.endsWith(".tgz"));
  assert.ok(sketchiconArchive.endsWith(".tgz"));
  console.log("Verified packed packages in an installed TypeScript and SSR consumer.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
