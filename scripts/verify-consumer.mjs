import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const runtimeManifest = JSON.parse(await readFile(path.join(root, "packages", "runtime", "package.json"), "utf8"));
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

const defaultReactPackages = [
  `react@${workspaceManifest.devDependencies.react}`,
  `react-dom@${workspaceManifest.devDependencies["react-dom"]}`,
  `@types/react@${workspaceManifest.devDependencies["@types/react"]}`,
  `@types/react-dom@${workspaceManifest.devDependencies["@types/react-dom"]}`,
];

async function createConsumer(
  name,
  archives,
  typeScript,
  runtime,
  { reactPackages = defaultReactPackages, reactServer } = {},
) {
  const consumerRoot = path.join(temporaryRoot, name);
  await mkdir(consumerRoot);
  await writeFile(path.join(consumerRoot, "package.json"), `${JSON.stringify({
    name: `sketchicon-${name}-fixture`,
    private: true,
    type: "module",
  }, null, 2)}\n`);
  const sharedCompilerOptions = {
    jsx: "react-jsx",
    noEmit: true,
    strict: true,
    target: "ES2022",
  };
  await writeFile(path.join(consumerRoot, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      ...sharedCompilerOptions,
      module: "NodeNext",
      moduleResolution: "NodeNext",
    },
    include: ["consumer.tsx"],
  }, null, 2)}\n`);
  await writeFile(path.join(consumerRoot, "tsconfig.bundler.json"), `${JSON.stringify({
    compilerOptions: {
      ...sharedCompilerOptions,
      module: "ESNext",
      moduleResolution: "Bundler",
    },
    include: ["consumer.tsx"],
  }, null, 2)}\n`);
  await writeFile(path.join(consumerRoot, "consumer.tsx"), typeScript);
  await writeFile(path.join(consumerRoot, "consumer.mjs"), runtime);
  if (reactServer) {
    await writeFile(path.join(consumerRoot, "react-server.mjs"), reactServer);
  }

  await exec("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...archives,
    ...reactPackages,
  ], { cwd: consumerRoot });
  await exec(process.execPath, [typeScriptBin, "-p", "tsconfig.json"], { cwd: consumerRoot });
  await exec(process.execPath, [typeScriptBin, "-p", "tsconfig.bundler.json"], { cwd: consumerRoot });
  await exec(process.execPath, ["consumer.mjs"], { cwd: consumerRoot });
  if (reactServer) {
    await exec(process.execPath, ["--conditions=react-server", "react-server.mjs"], { cwd: consumerRoot });
  }
  return consumerRoot;
}

async function assertEditorType(consumerRoot, specifier) {
  const fileName = path.join(consumerRoot, "editor.ts");
  const source = `import Icon from "${specifier}";\nIcon;\n`;
  await writeFile(fileName, source);
  const host = {
    directoryExists: ts.sys.directoryExists,
    fileExists: ts.sys.fileExists,
    getCompilationSettings: () => ({
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
    }),
    getCurrentDirectory: () => consumerRoot,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getDirectories: ts.sys.getDirectories,
    getScriptFileNames: () => [fileName],
    getScriptSnapshot: (target) => {
      const contents = ts.sys.readFile(target);
      return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents);
    },
    getScriptVersion: () => "0",
    readDirectory: ts.sys.readDirectory,
    readFile: ts.sys.readFile,
    realpath: ts.sys.realpath,
  };
  const service = ts.createLanguageService(host);
  const quickInfo = service.getQuickInfoAtPosition(
    fileName,
    source.lastIndexOf("Icon"),
  );
  service.dispose();
  const display = ts.displayPartsToString(quickInfo?.displayParts);
  assert.match(
    display,
    /SketchGeometry/,
    `Expected editor type information for ${specifier}; received ${display || "none"}`,
  );
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
      'import { SketchIcon as ServerSketchIcon, type SketchIconServerProps } from "sketchicon/server";',
      'import type { Ref } from "react";',
      'const geometry: SketchGeometry = { primitives: [{ type: "line", x1: 0, y1: 0, x2: 24, y2: 24 }] };',
      'const ref: Ref<SVGSVGElement> = null;',
      'const serverProps: SketchIconServerProps = { icon: geometry, title: "Line" };',
      "renderSketch(geometry);",
      "<SketchIcon icon={geometry} ref={ref} />;",
      "<RuntimeSketchIcon icon={geometry} />;",
      "<ServerSketchIcon {...serverProps} />;",
      "// @ts-expect-error refs cannot cross a React Server Component boundary",
      "<ServerSketchIcon icon={geometry} ref={ref} />;",
      "// @ts-expect-error event handlers require the client entry",
      "<ServerSketchIcon icon={geometry} onClick={() => undefined} />;",
      "",
    ].join("\n"),
    [
      'import assert from "node:assert/strict";',
      'import { createElement } from "react";',
      'import { renderToStaticMarkup } from "react-dom/server";',
      'import { SketchIcon } from "sketchicon";',
      'import { renderSketch } from "sketchicon/core";',
      'import { SketchIcon as RuntimeSketchIcon } from "sketchicon/runtime";',
      'import { SketchIcon as ServerSketchIcon } from "sketchicon/server";',
      'const geometry = { primitives: [{ type: "line", x1: 0, y1: 0, x2: 24, y2: 24 }] };',
      "assert.equal(RuntimeSketchIcon, SketchIcon);",
      "assert.ok(renderSketch(geometry).length > 0);",
      'const clientMarkup = renderToStaticMarkup(createElement(SketchIcon, { icon: geometry }));',
      'const serverMarkup = renderToStaticMarkup(createElement(ServerSketchIcon, { icon: geometry }));',
      "assert.equal(serverMarkup, clientMarkup);",
      'assert.match(serverMarkup, /^<svg/);',
      "",
    ].join("\n"),
    {
      reactServer: [
        'import assert from "node:assert/strict";',
        'import { SketchIcon } from "sketchicon/server";',
        'const icon = { primitives: [{ type: "line", x1: 0, y1: 0, x2: 24, y2: 24 }] };',
        'const element = SketchIcon({ icon });',
        'assert.equal(element.type, "svg");',
        'assert.equal(element.props["aria-hidden"], true);',
        "",
      ].join("\n"),
    },
  );
  await assert.rejects(access(path.join(runtimeRoot, "node_modules", "@sketchicon", "lucide")));
  await assert.rejects(access(path.join(runtimeRoot, "node_modules", "@sketchicon", "hugeicons")));

  const sketchiconBin = path.join(runtimeRoot, "node_modules", ".bin", "sketchicon");
  const { stdout: sketchiconHelp } = await exec(sketchiconBin, ["--help"], { cwd: runtimeRoot });
  assert.match(sketchiconHelp, /npx sketchicon@latest --hugeicons/);
  const { stdout: sketchiconDryRun } = await exec(sketchiconBin, [
    "--dry-run",
    "--hugeicons",
    "--package-manager",
    "npm",
  ], { cwd: runtimeRoot });
  assert.match(sketchiconDryRun, /Icon packs: hugeicons/);
  assert.ok(sketchiconDryRun.includes(
    `sketchicon@${runtimeManifest.version} @sketchicon/hugeicons@${runtimeManifest.version}`,
  ));

  await createConsumer(
    "runtime-react-18",
    [archives.core, archives.runtime],
    await readFile(path.join(runtimeRoot, "consumer.tsx"), "utf8"),
    await readFile(path.join(runtimeRoot, "consumer.mjs"), "utf8"),
    {
      reactPackages: [
        "react@18.3.1",
        "react-dom@18.3.1",
        "@types/react@18.3.24",
        "@types/react-dom@18.3.7",
      ],
    },
  );

  const lucideRoot = await createConsumer(
    "lucide-only",
    [archives.core, archives.runtime, archives.lucide],
    [
      'import { Search } from "@sketchicon/lucide";',
      'import SearchDirect from "@sketchicon/lucide/icons/search";',
      'import { SketchIcon } from "sketchicon";',
      'import type { SketchGeometry } from "@sketchicon/core";',
      'const directGeometry: SketchGeometry = SearchDirect;',
      "<SketchIcon icon={SearchDirect} />;",
      "Search satisfies typeof SearchDirect;",
      "",
    ].join("\n"),
    [
      'import assert from "node:assert/strict";',
      'import { createElement } from "react";',
      'import { renderToStaticMarkup } from "react-dom/server";',
      'import { Search } from "@sketchicon/lucide";',
      'import SearchDirect from "@sketchicon/lucide/icons/search";',
      'import { SketchIcon } from "sketchicon/server";',
      "assert.deepEqual(Search, SearchDirect);",
      'assert.match(renderToStaticMarkup(createElement(SketchIcon, { icon: SearchDirect })), /^<svg/);',
      "",
    ].join("\n"),
  );
  await assertEditorType(lucideRoot, "@sketchicon/lucide/icons/search");
  await assert.rejects(access(path.join(lucideRoot, "node_modules", "@sketchicon", "hugeicons")));

  const hugeiconsRoot = await createConsumer(
    "hugeicons-only",
    [archives.core, archives.runtime, archives.hugeicons],
    [
      'import { Home01Icon } from "@sketchicon/hugeicons";',
      'import HomeDirect from "@sketchicon/hugeicons/icons/home-01";',
      'import { SketchIcon } from "sketchicon";',
      'import type { SketchGeometry } from "@sketchicon/core";',
      'const directGeometry: SketchGeometry = HomeDirect;',
      "<SketchIcon icon={HomeDirect} />;",
      "Home01Icon satisfies typeof HomeDirect;",
      "",
    ].join("\n"),
    [
      'import assert from "node:assert/strict";',
      'import { createElement } from "react";',
      'import { renderToStaticMarkup } from "react-dom/server";',
      'import { Home01Icon } from "@sketchicon/hugeicons";',
      'import HomeDirect from "@sketchicon/hugeicons/icons/home-01";',
      'import { SketchIcon } from "sketchicon/server";',
      "assert.deepEqual(Home01Icon, HomeDirect);",
      'assert.match(renderToStaticMarkup(createElement(SketchIcon, { icon: HomeDirect })), /^<svg/);',
      "",
    ].join("\n"),
  );
  await assertEditorType(hugeiconsRoot, "@sketchicon/hugeicons/icons/home-01");
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
  await writeFile(path.join(cliRoot, "package.json"), '{"private":true,"type":"module","dependencies":{"sketchicon":"^0.1.5"}}\n');
  await writeFile(
    path.join(cliRoot, "fixture.tsx"),
    'import { Search, SketchIcon } from "sketchicon";\nimport Home from "sketchicon/hugeicons/icons/home-01";\n',
  );
  await exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", archives.create], { cwd: cliRoot });
  const cliBin = path.join(cliRoot, "node_modules", ".bin", "create-sketchicon");
  const { stdout: helpOutput } = await exec(cliBin, ["--help"], { cwd: cliRoot });
  assert.match(helpOutput, /--migrate/);
  const { stdout: dryRunOutput } = await exec(cliBin, [
    "--dry-run",
    "--packs",
    "hugeicons",
    "--package-manager",
    "npm",
  ], { cwd: cliRoot });
  assert.match(dryRunOutput, /SketchIcon 0\.1 detected; existing imports will be migrated automatically/);
  assert.match(dryRunOutput, /Would update fixture\.tsx/);
  assert.match(dryRunOutput, /-import \{ Search, SketchIcon \} from "sketchicon"/);
  assert.match(dryRunOutput, /\+import \{ Search \} from "@sketchicon\/lucide"/);
  assert.match(dryRunOutput, /Icon packs: hugeicons, lucide/);
  assert.match(dryRunOutput, /Required by migration: lucide/);
  assert.ok(dryRunOutput.includes(
    `sketchicon@${runtimeManifest.version} @sketchicon/hugeicons@${runtimeManifest.version} @sketchicon/lucide@${runtimeManifest.version}`,
  ));
  assert.match(await readFile(path.join(cliRoot, "fixture.tsx"), "utf8"), /from "sketchicon"/);

  console.log("Verified packed React 18/19, NodeNext, Bundler, editor types, SSR/server, provider, and initializer consumers.");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
