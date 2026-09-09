import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import {
  applyMigrationPlan,
  detectPackageManager,
  detectFrameworks,
  detectedFrameworks,
  formatFrameworkEvidence,
  findProjectRoot,
  formatMigrationDiff,
  gettingStartedImports,
  hasSketchiconV1,
  includeMigrationPacks,
  installCommand,
  installedPacks,
  packNames,
  packRegistry,
  parseArgs,
  parsePackSelection,
  planMigration,
  type Framework,
  frameworkNames,
  type IconPack,
} from "./lib.js";

export interface RunCliOptions {
  commandName: "create-sketchicon" | "sketchicon";
  packageUrl: string;
}

function help(commandName: string, version: string): string {
  const packageSpec = `${commandName}@${version.includes("-") ? version : "latest"}`;
  const packUsage = packNames
    .map((pack) => `  npx ${packageSpec} --${pack}`)
    .join("\n");
  const packOptions = packNames.map((pack) => {
    const flag = `--${pack}`.padEnd(25);
    return `  ${flag} Install the ${packRegistry[pack].label} icon pack`;
  }).join("\n");
  return `${commandName}

Install the lightweight SketchIcon runtime and only the icon packs you choose.

Usage:
  npx ${packageSpec}
${packUsage}
  npx ${packageSpec} --packs lucide,hugeicons
  npx ${packageSpec} --migrate
  npx ${packageSpec} --framework vue --lucide

Options:
${packOptions}
  --all                     Install every available icon pack
  --framework <name>        react, vue, or angular
  --react                   Select the React adapter
  --vue                     Select the Vue 3 adapter
  --angular                 Report Angular adapter availability
  --packs <names>           Comma-separated lucide and/or hugeicons
  --package-manager <name>  npm, pnpm, yarn, or bun
  --cwd <path>              Start package.json discovery from this directory
  --migrate                 Rewrite SketchIcon 0.1 catalog imports
  --dry-run                 Print actions without installing or writing
  --yes, -y                 Use default packs without an installer prompt
  --help, -h                Show this help

For CI, put npx's own --yes before the package name:
  npx --yes ${packageSpec} --lucide
`;
}

export function packageManagerNeedsShell(platform: NodeJS.Platform = process.platform): boolean {
  // npm, pnpm, and Yarn are installed as .cmd shims on Windows. Node cannot
  // execute those shims directly, so use the Windows command shell. The
  // command and arguments passed here are restricted to package managers,
  // registered package names, and this package's own version.
  return platform === "win32";
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: packageManagerNeedsShell(),
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`));
    });
  });
}

async function packageVersion(packageUrl: string): Promise<string> {
  const manifestUrl = new URL("../package.json", packageUrl);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8")) as { version?: unknown };
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error(`Could not determine the installer version from ${manifestUrl.pathname}.`);
  }
  return manifest.version;
}

async function chooseFramework(): Promise<Framework> {
  const choices = [
    "  1. React",
    "  2. Vue 3 (including Nuxt)",
    "  3. Angular (adapter not available yet)",
  ];
  const prompt = [
    "Which framework does this project use?",
    ...choices,
    "Selection [1]: ",
  ].join("\n");
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question(prompt)).trim().toLowerCase();
    if (!answer) return "react";
    const byNumber = frameworkNames[Number(answer) - 1];
    if (byNumber) return byNumber;
    if (frameworkNames.includes(answer as Framework)) return answer as Framework;
    throw new Error("Invalid framework selection. Choose 1, 2, 3, react, vue, or angular.");
  } finally {
    readline.close();
  }
}

async function choosePacks(defaults: readonly IconPack[]): Promise<IconPack[]> {
  const selected: readonly IconPack[] = defaults.length > 0 ? defaults : ["lucide"];
  const choices = packNames.map((pack, index) => {
    const metadata = packRegistry[pack];
    return `  ${index + 1}. ${metadata.label} — ${metadata.description}`;
  });
  const prompt = [
    "Which icon packs would you like to install?",
    ...choices,
    "  Enter one or more numbers or names (use 'all' for every pack).",
    `Selection [${selected.map((pack) => packNames.indexOf(pack) + 1).join(", ")}]: `,
  ].join("\n");
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question(prompt)).trim();
    return parsePackSelection(answer, selected);
  } finally {
    readline.close();
  }
}

export async function runCli(args: readonly string[], cli: RunCliOptions): Promise<void> {
  const options = parseArgs(args);
  const version = await packageVersion(cli.packageUrl);
  if (options.help) {
    process.stdout.write(help(cli.commandName, version));
    return;
  }

  const projectRoot = await findProjectRoot(options.cwd ? path.resolve(options.cwd) : process.cwd());
  const manifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8")) as Record<string, unknown>;
  const detectedV1 = hasSketchiconV1(manifest);
  const shouldMigrate = options.migrate || detectedV1;
  if (detectedV1 && !options.migrate) {
    process.stdout.write("SketchIcon 0.1 detected; existing imports will be migrated automatically.\n");
  }
  const evidence = detectFrameworks(manifest);
  const detected = detectedFrameworks(evidence);
  let framework = options.framework;
  if (!framework) {
    if (detected.length === 1) {
      framework = detected[0]!;
    } else if (detected.length > 1) {
      throw new Error(
        `Multiple frameworks were detected in ${projectRoot}:\n` +
        `${formatFrameworkEvidence(evidence)}\n` +
        "Use --cwd to target a package in a monorepo or --framework to override detection.",
      );
    } else if (process.stdin.isTTY && process.stdout.isTTY) {
      framework = await chooseFramework();
    } else {
      throw new Error(
        "Could not detect React, Vue/Nuxt, or Angular from direct package.json " +
        "dependencies. Non-interactive use requires --framework react|vue|angular.",
      );
    }
  }
  if (framework === "angular") {
    throw new Error(
      "Angular was detected or selected, but a SketchIcon Angular adapter is not available yet.",
    );
  }
  if (shouldMigrate && framework !== "react") {
    throw new Error(
      "SketchIcon 0.1 migration is only available for React projects.",
    );
  }
  const migration = shouldMigrate ? await planMigration(projectRoot) : { edits: [], packs: new Set<IconPack>() };
  const existing = installedPacks(manifest);
  const defaults = [...new Set([...existing, ...migration.packs])];

  let packs = options.packs;
  if (!packs) {
    if (options.yes) packs = defaults.length > 0 ? defaults : ["lucide"];
    else if (process.stdin.isTTY && process.stdout.isTTY) packs = await choosePacks(defaults);
    else throw new Error("Non-interactive use requires a pack flag, --packs, or --yes.");
  }

  const selectedPacks = packs;
  packs = includeMigrationPacks(selectedPacks, migration.packs);
  const addedMigrationPacks = packs.filter((pack) => !selectedPacks.includes(pack));
  const retainedPacks = existing.filter((pack) => !packs.includes(pack));

  const manager = options.packageManager ?? await detectPackageManager(projectRoot, manifest);
  const [command, installArgs] = installCommand(manager, packs, version, framework);

  process.stdout.write(`\nSketchIcon project: ${projectRoot}\n`);
  process.stdout.write(`Icon packs: ${packs.join(", ")}\n`);
  if (addedMigrationPacks.length > 0) {
    process.stdout.write(`Required by migration: ${addedMigrationPacks.join(", ")}\n`);
    process.stdout.write("Existing icons keep their current provider; migration does not substitute icons between packs.\n");
  }
  process.stdout.write(`Framework: ${framework}\n`);
  if (retainedPacks.length > 0) {
    process.stdout.write(`Already installed and not removed: ${retainedPacks.join(", ")}\n`);
  }
  process.stdout.write(`Install: ${command} ${installArgs.join(" ")}\n`);
  if (shouldMigrate) {
    process.stdout.write(`Migration: ${migration.edits.length} source file${migration.edits.length === 1 ? "" : "s"}\n`);
  }

  if (options.dryRun) {
    migration.edits.forEach((edit) => {
      const relativeFile = path.relative(projectRoot, edit.file);
      process.stdout.write(`\nWould update ${relativeFile}\n`);
      process.stdout.write(`${formatMigrationDiff(edit, relativeFile)}\n`);
    });
    process.stdout.write("\nDry run complete; no files were changed.\n");
    return;
  }

  await run(command, installArgs, projectRoot);
  if (shouldMigrate) await applyMigrationPlan(migration);

  process.stdout.write("\nSketchIcon is ready. Start with:\n\n");
  process.stdout.write(`${gettingStartedImports(packs, framework)}\n`);
  if (addedMigrationPacks.includes("lucide") && selectedPacks.includes("hugeicons")) {
    process.stdout.write("\nTo use only Hugeicons, replace the migrated Lucide icons, then remove @sketchicon/lucide with your package manager.\n");
  }
}

export function reportCliError(commandName: string, error: unknown): void {
  process.stderr.write(`${commandName}: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
