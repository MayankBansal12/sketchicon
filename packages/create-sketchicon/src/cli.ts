#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import {
  applyMigrationPlan,
  detectPackageManager,
  findProjectRoot,
  formatMigrationDiff,
  gettingStartedImports,
  hasSketchiconV1,
  includeMigrationPacks,
  installCommand,
  installedPacks,
  packNames,
  parseArgs,
  parsePackSelection,
  planMigration,
  type IconPack,
} from "./lib.js";

const help = `create-sketchicon

Install the lightweight SketchIcon runtime and only the icon packs you choose.

Usage:
  npx create-sketchicon@latest
  npx create-sketchicon@latest --packs lucide,hugeicons --yes
  npx create-sketchicon@latest --migrate

Options:
  --packs <names>            Comma-separated lucide and/or hugeicons
  --package-manager <name>   npm, pnpm, yarn, or bun
  --cwd <path>               Start package.json discovery from this directory
  --migrate                  Rewrite SketchIcon 0.1 catalog imports
  --dry-run                  Print actions without installing or writing
  --yes, -y                  Use defaults without prompting
  --help, -h                 Show this help
`;

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`));
    });
  });
}

async function choosePacks(defaults: readonly IconPack[]): Promise<IconPack[]> {
  const selected: readonly IconPack[] = defaults.length > 0 ? defaults : ["lucide"];
  const prompt = [
    "Which icon packs would you like to install?",
    "  1. Lucide — familiar interface icons",
    "  2. Hugeicons — expressive interface icons",
    "  Enter one or more numbers or names (use 'all' for both).",
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

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(help);
    return;
  }

  const projectRoot = await findProjectRoot(options.cwd ? path.resolve(options.cwd) : process.cwd());
  const manifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8")) as Record<string, unknown>;
  const detectedV1 = hasSketchiconV1(manifest);
  const shouldMigrate = options.migrate || detectedV1;
  if (detectedV1 && !options.migrate) {
    process.stdout.write("SketchIcon 0.1 detected; existing imports will be migrated automatically.\n");
  }
  const migration = shouldMigrate ? await planMigration(projectRoot) : { edits: [], packs: new Set<IconPack>() };
  const existing = installedPacks(manifest);
  const defaults = [...new Set([...existing, ...migration.packs])];

  let packs = options.packs;
  if (!packs) {
    if (options.yes) packs = defaults.length > 0 ? defaults : ["lucide"];
    else if (process.stdin.isTTY && process.stdout.isTTY) packs = await choosePacks(defaults);
    else throw new Error("Non-interactive use requires --packs or --yes.");
  }

  const selectedPacks = packs;
  packs = includeMigrationPacks(selectedPacks, migration.packs);
  const addedMigrationPacks = packs.filter((pack) => !selectedPacks.includes(pack));
  const retainedPacks = existing.filter((pack) => !packs.includes(pack));

  const manager = options.packageManager ?? await detectPackageManager(projectRoot, manifest);
  const [command, args] = installCommand(manager, packs);

  process.stdout.write(`\nSketchIcon project: ${projectRoot}\n`);
  process.stdout.write(`Icon packs: ${packs.join(", ")}\n`);
  if (addedMigrationPacks.length > 0) {
    process.stdout.write(`Required by migration: ${addedMigrationPacks.join(", ")}\n`);
    process.stdout.write("Existing icons keep their current provider; migration does not substitute icons between packs.\n");
  }
  if (retainedPacks.length > 0) {
    process.stdout.write(`Already installed and not removed: ${retainedPacks.join(", ")}\n`);
  }
  process.stdout.write(`Install: ${command} ${args.join(" ")}\n`);
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

  await run(command, args, projectRoot);
  if (shouldMigrate) await applyMigrationPlan(migration);

  process.stdout.write("\nSketchIcon is ready. Start with:\n\n");
  process.stdout.write(`${gettingStartedImports(packs)}\n`);
  if (addedMigrationPacks.includes("lucide") && selectedPacks.includes("hugeicons")) {
    process.stdout.write("\nTo use only Hugeicons, replace the migrated Lucide icons, then remove @sketchicon/lucide with your package manager.\n");
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`create-sketchicon: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
