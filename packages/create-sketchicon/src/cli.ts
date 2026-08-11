#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import {
  applyMigrationPlan,
  detectPackageManager,
  findProjectRoot,
  installCommand,
  installedPacks,
  packNames,
  parseArgs,
  planMigration,
  type IconPack,
} from "./lib.js";

const help = `create-sketchicon

Install the lightweight SketchIcon runtime and only the icon packs you choose.

Usage:
  npm create sketchicon@latest
  npm create sketchicon@latest -- --packs lucide,hugeicons --yes
  npm create sketchicon@latest -- --migrate

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
    "Choose icon packs (comma-separated numbers):",
    "  1. Lucide — familiar interface icons",
    "  2. Hugeicons — expressive interface icons",
    `Selection [${selected.map((pack) => packNames.indexOf(pack) + 1).join(",")}]: `,
  ].join("\n");
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question(prompt)).trim();
    if (!answer) return [...selected];
    const packs = [...new Set(answer.split(",").map((choice) => {
      const index = Number(choice.trim()) - 1;
      const pack = packNames[index];
      if (!pack) throw new Error(`Invalid pack selection: ${choice}`);
      return pack;
    }))];
    if (packs.length === 0) throw new Error("Choose at least one icon pack.");
    return packs;
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
  const migration = options.migrate ? await planMigration(projectRoot) : { edits: [], packs: new Set<IconPack>() };
  const existing = installedPacks(manifest);
  const defaults = [...new Set([...existing, ...migration.packs])];

  let packs = options.packs;
  if (!packs) {
    if (options.yes) packs = defaults.length > 0 ? defaults : ["lucide"];
    else if (process.stdin.isTTY && process.stdout.isTTY) packs = await choosePacks(defaults);
    else throw new Error("Non-interactive use requires --packs or --yes.");
  }

  const manager = options.packageManager ?? await detectPackageManager(projectRoot, manifest);
  const [command, args] = installCommand(manager, packs);

  process.stdout.write(`\nSketchIcon project: ${projectRoot}\n`);
  process.stdout.write(`Icon packs: ${packs.join(", ")}\n`);
  process.stdout.write(`Install: ${command} ${args.join(" ")}\n`);
  if (options.migrate) {
    process.stdout.write(`Migration: ${migration.edits.length} source file${migration.edits.length === 1 ? "" : "s"}\n`);
  }

  if (options.dryRun) {
    migration.edits.forEach((edit) => process.stdout.write(`Would update ${path.relative(projectRoot, edit.file)}\n`));
    process.stdout.write("\nDry run complete; no files were changed.\n");
    return;
  }

  await run(command, args, projectRoot);
  if (options.migrate) await applyMigrationPlan(migration);

  process.stdout.write("\nSketchIcon is ready.\n\n");
  process.stdout.write('import { SketchIcon } from "sketchicon";\n');
  if (packs.includes("lucide")) process.stdout.write('import Search from "@sketchicon/lucide/icons/search";\n');
  if (packs.includes("hugeicons")) process.stdout.write('import Home01Icon from "@sketchicon/hugeicons/icons/home-01";\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`create-sketchicon: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
