import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-consumer-"));
const typeScriptBin = path.join(root, "node_modules", "typescript", "bin", "tsc");

async function pack(workspace) {
  const { stdout } = await exec(
    "npm",
    ["pack", "--workspace", workspace, "--json", "--pack-destination", temporaryRoot],
    { cwd: root, maxBuffer: 32 * 1024 * 1024 },
  );
  const [result] = JSON.parse(stdout);
  if (!result?.filename) throw new Error(`npm pack did not return an archive for ${workspace}.`);
  return path.join(temporaryRoot, result.filename);
}

async function createConsumer(name, archives, typeScript, runtime) {
  const consumerRoot = path.join(temporaryRoot, name);
  await mkdir(consumerRoot);
  await writeFile(path.join(consumerRoot, "package.json"), `${JSON.stringify({
    name: `sketchicon-${name}-fixture`,
    private: true,
    type: "module",
  }, null, 2)}\n`);
  await writeFile(path.join(consumerRoot, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      jsx: "react-jsx",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      noEmit: true,
      strict: true,
      target: "ES2022",
    },
    include: ["consumer.tsx"],
  }, null, 2)}\n`);
  await writeFile(path.join(consumerRoot, "consumer.tsx"), typeScript);
  await writeFile(path.join(consumerRoot, "consumer.mjs"), runtime);

  await exec("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...archives,
    `react@${workspaceManifest.devDependencies.react}`,
    `react-dom@${workspaceManifest.devDependencies["react-dom"]}`,
    `@types/react@${workspaceManifest.devDependencies["@types/react"]}`,
  ], { cwd: consumerRoot });
  await exec(process.execPath, [typeScriptBin, "-p", "tsconfig.json"], { cwd: consumerRoot });
  await exec(process.execPath, ["consumer.mjs"], { cwd: consumerRoot });
  return consumerRoot;
}

try {
  const archives = {
    core: await pack("@sketchicon/core"),
    runtime: await pack("sketchicon"),
    lucide: await pack("@sketchicon/lucide"),
    hugeicons: await pack("@sketchicon/hugeicons"),
    create: await pack("create-sketchicon"),
  };

  const runtimeRoot = await createConsumer(
    "runtime-only",
    [archives.core, archives.runtime],
    [
      'import { SketchIcon, type SketchGeometry } from "sketchicon";',
      'import { renderSketch } from "sketchicon/core";',
      'import { SketchIcon as RuntimeSketchIcon } from "sketchicon/runtime";',
      'const geometry: SketchGeometry = { primitives: [{ type: "line", x1: 0, y1: 0, x2: 24, y2: 24 }] };',
      "renderSketch(geometry);",
      "<SketchIcon icon={geometry} />;",
      "<RuntimeSketchIcon icon={geometry} />;",
      "",
    ].join("\n"),
    [
      'import assert from "node:assert/strict";',
      'import { createElement } from "react";',
      'import { renderToStaticMarkup } from "react-dom/server";',
      'import { SketchIcon } from "sketchicon";',
      'import { renderSketch } from "sketchicon/core";',
      'import { SketchIcon as RuntimeSketchIcon } from "sketchicon/runtime";',
      'const geometry = { primitives: [{ type: "line", x1: 0, y1: 0, x2: 24, y2: 24 }] };',
      "assert.equal(RuntimeSketchIcon, SketchIcon);",
      "assert.ok(renderSketch(geometry).length > 0);",
      'assert.match(renderToStaticMarkup(createElement(SketchIcon, { icon: geometry })), /^<svg/);',
      "",
    ].join("\n"),
  );
  await assert.rejects(access(path.join(runtimeRoot, "node_modules", "@sketchicon", "lucide")));
  await assert.rejects(access(path.join(runtimeRoot, "node_modules", "@sketchicon", "hugeicons")));

  const lucideRoot = await createConsumer(
    "lucide-only",
    [archives.core, archives.runtime, archives.lucide],
    [
      'import { Search } from "@sketchicon/lucide";',
      'import SearchDirect from "@sketchicon/lucide/icons/search";',
      'import { SketchIcon } from "sketchicon";',
      "<SketchIcon icon={SearchDirect} />;",
      "Search satisfies typeof SearchDirect;",
      "",
    ].join("\n"),
    [
      'import assert from "node:assert/strict";',
      'import { Search } from "@sketchicon/lucide";',
      'import SearchDirect from "@sketchicon/lucide/icons/search";',
      "assert.deepEqual(Search, SearchDirect);",
      "",
    ].join("\n"),
  );
  await assert.rejects(access(path.join(lucideRoot, "node_modules", "@sketchicon", "hugeicons")));

  const hugeiconsRoot = await createConsumer(
    "hugeicons-only",
    [archives.core, archives.runtime, archives.hugeicons],
    [
      'import { Home01Icon } from "@sketchicon/hugeicons";',
      'import HomeDirect from "@sketchicon/hugeicons/icons/home-01";',
      'import { SketchIcon } from "sketchicon";',
      "<SketchIcon icon={HomeDirect} />;",
      "Home01Icon satisfies typeof HomeDirect;",
      "",
    ].join("\n"),
    [
      'import assert from "node:assert/strict";',
      'import { Home01Icon } from "@sketchicon/hugeicons";',
      'import HomeDirect from "@sketchicon/hugeicons/icons/home-01";',
      "assert.deepEqual(Home01Icon, HomeDirect);",
      "",
    ].join("\n"),
  );
  await assert.rejects(access(path.join(hugeiconsRoot, "node_modules", "@sketchicon", "lucide")));

  await createConsumer(
    "both-providers",
    [archives.core, archives.runtime, archives.lucide, archives.hugeicons],
    [
      'import Search from "@sketchicon/lucide/icons/search";',
      'import Home from "@sketchicon/hugeicons/icons/home-01";',
      'import { SketchIcon } from "sketchicon";',
      "<><SketchIcon icon={Search} /><SketchIcon icon={Home} /></>;",
      "",
    ].join("\n"),
    [
      'import assert from "node:assert/strict";',
      'import Search from "@sketchicon/lucide/icons/search";',
      'import Home from "@sketchicon/hugeicons/icons/home-01";',
      "assert.notDeepEqual(Search, Home);",
      "",
    ].join("\n"),
  );

  const cliRoot = path.join(temporaryRoot, "initializer");
  await mkdir(cliRoot);
  await writeFile(path.join(cliRoot, "package.json"), '{"private":true,"type":"module"}\n');
  await writeFile(
    path.join(cliRoot, "fixture.tsx"),
    'import { Search, SketchIcon } from "sketchicon";\nimport Home from "sketchicon/hugeicons/icons/home-01";\n',
  );
  await exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", archives.create], { cwd: cliRoot });
  const cliBin = path.join(cliRoot, "node_modules", ".bin", "create-sketchicon");
  const { stdout: helpOutput } = await exec(cliBin, ["--help"], { cwd: cliRoot });
  assert.match(helpOutput, /--migrate/);
  const { stdout: dryRunOutput } = await exec(cliBin, [
    "--migrate",
    "--dry-run",
    "--packs",
    "lucide,hugeicons",
    "--package-manager",
    "npm",
  ], { cwd: cliRoot });
  assert.match(dryRunOutput, /Would update fixture\.tsx/);
  assert.match(await readFile(path.join(cliRoot, "fixture.tsx"), "utf8"), /from "sketchicon"/);

  console.log("Verified packed runtime-only, Lucide-only, Hugeicons-only, combined, and initializer consumers.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
