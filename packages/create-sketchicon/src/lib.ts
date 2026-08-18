import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const packNames = ["lucide", "hugeicons"] as const;
export const packageManagers = ["npm", "pnpm", "yarn", "bun"] as const;

export type IconPack = (typeof packNames)[number];
export type PackageManager = (typeof packageManagers)[number];

export interface CliOptions {
  cwd?: string;
  dryRun: boolean;
  help: boolean;
  migrate: boolean;
  packageManager?: PackageManager;
  packs?: IconPack[];
  yes: boolean;
}

export interface MigrationEdit {
  file: string;
  original: string;
  source: string;
}

export interface MigrationPlan {
  edits: MigrationEdit[];
  packs: Set<IconPack>;
}

export interface RewriteResult {
  changed: boolean;
  issues: string[];
  packs: Set<IconPack>;
  source: string;
}

const runtimeRootExports = new Set(["SketchGeometry", "SketchIcon", "SketchIconProps"]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const sourceExtensions = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

function packageManagerFrom(value: string | undefined): PackageManager | undefined {
  const name = value?.split(/[\s/@]/, 1)[0];
  return packageManagers.find((manager) => manager === name);
}

function parsePacks(value: string): IconPack[] {
  const values = [...new Set(value.split(",").map((pack) => pack.trim()).filter(Boolean))];
  const invalid = values.filter((pack) => !packNames.includes(pack as IconPack));
  if (invalid.length > 0) throw new Error(`Unknown icon pack: ${invalid.join(", ")}`);
  if (values.length === 0) throw new Error("Choose at least one icon pack.");
  return values as IconPack[];
}

export function parsePackSelection(value: string, defaults: readonly IconPack[]): IconPack[] {
  const selection = value.trim().toLowerCase();
  if (!selection) return [...defaults];
  if (selection === "all") return [...packNames];

  const choices = selection.split(/[\s,]+/).filter(Boolean);
  if (choices.length === 0) throw new Error("Choose at least one icon pack.");
  const packs = choices.map((choice) => {
    if (packNames.includes(choice as IconPack)) return choice as IconPack;
    const pack = packNames[Number(choice) - 1];
    if (pack) return pack;
    throw new Error(
      `Invalid pack selection: ${choice}. Choose 1, 2, lucide, hugeicons, or all.`,
    );
  });

  return [...new Set(packs)];
}

export function gettingStartedImports(packs: readonly IconPack[]): string {
  return [
    'import { SketchIcon } from "sketchicon";',
    ...(packs.includes("lucide") ? ['import Search from "@sketchicon/lucide/icons/search";'] : []),
    ...(packs.includes("hugeicons")
      ? ['import Home01Icon from "@sketchicon/hugeicons/icons/home-01";']
      : []),
  ].join("\n");
}

function nextValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

export function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    help: false,
    migrate: false,
    yes: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--cwd":
        options.cwd = nextValue(args, index++, argument);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--migrate":
        options.migrate = true;
        break;
      case "--package-manager": {
        const value = nextValue(args, index++, argument);
        const manager = packageManagerFrom(value);
        if (!manager) throw new Error(`Unsupported package manager: ${value}`);
        options.packageManager = manager;
        break;
      }
      case "--packs":
        options.packs = parsePacks(nextValue(args, index++, argument));
        break;
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

export async function findProjectRoot(start: string): Promise<string> {
  let directory = path.resolve(start);
  while (true) {
    try {
      await access(path.join(directory, "package.json"));
      return directory;
    } catch {
      const parent = path.dirname(directory);
      if (parent === directory) throw new Error(`Could not find package.json from ${start}.`);
      directory = parent;
    }
  }
}

export async function detectPackageManager(
  projectRoot: string,
  manifest: Record<string, unknown>,
  userAgent = process.env.npm_config_user_agent,
): Promise<PackageManager> {
  const declared = packageManagerFrom(typeof manifest.packageManager === "string" ? manifest.packageManager : undefined);
  if (declared) return declared;

  for (const [file, manager] of [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ] as const) {
    try {
      await access(path.join(projectRoot, file));
      return manager;
    } catch {
      // Try the next lockfile.
    }
  }

  const fromAgent = packageManagerFrom(userAgent);
  if (fromAgent) return fromAgent;

  return "npm";
}

export function installedPacks(manifest: Record<string, unknown>): IconPack[] {
  const dependencyGroups = ["dependencies", "devDependencies", "optionalDependencies"]
    .map((key) => manifest[key])
    .filter((group): group is Record<string, unknown> => Boolean(group) && typeof group === "object");
  return packNames.filter((pack) => dependencyGroups.some((group) => `@sketchicon/${pack}` in group));
}

export function hasSketchiconV1(manifest: Record<string, unknown>): boolean {
  const dependencyGroups = ["dependencies", "devDependencies", "optionalDependencies"]
    .map((key) => manifest[key])
    .filter((group): group is Record<string, unknown> => Boolean(group) && typeof group === "object");
  const version = dependencyGroups
    .map((group) => group.sketchicon)
    .find((value): value is string => typeof value === "string");
  return version ? /(^|\D)0\.1(?:\.|\D|$)/.test(version) && !/(^|\D)0\.2(?:\.|\D|$)/.test(version) : false;
}

export function installCommand(manager: PackageManager, packs: readonly IconPack[]): [string, string[]] {
  const dependencies = ["sketchicon", ...packs.map((pack) => `@sketchicon/${pack}`)];
  switch (manager) {
    case "npm":
      return ["npm", ["install", ...dependencies]];
    case "pnpm":
      return ["pnpm", ["add", ...dependencies]];
    case "yarn":
      return ["yarn", ["add", ...dependencies]];
    case "bun":
      return ["bun", ["add", ...dependencies]];
  }
}

export function includeMigrationPacks(
  selected: readonly IconPack[],
  required: ReadonlySet<IconPack>,
): IconPack[] {
  return [...new Set([...selected, ...required])];
}

export function formatMigrationDiff(edit: MigrationEdit, relativeFile = edit.file): string {
  const originalLines = edit.original.trimEnd().split("\n");
  const sourceLines = edit.source.trimEnd().split("\n");
  const remainingSource = [...sourceLines];
  const removed = originalLines.filter((line) => {
    const index = remainingSource.indexOf(line);
    if (index < 0) return true;
    remainingSource.splice(index, 1);
    return false;
  });
  const remainingOriginal = [...originalLines];
  const added = sourceLines.filter((line) => {
    const index = remainingOriginal.indexOf(line);
    if (index < 0) return true;
    remainingOriginal.splice(index, 1);
    return false;
  });
  return [`--- ${relativeFile}`, `+++ ${relativeFile}`, ...removed.map((line) => `-${line}`), ...added.map((line) => `+${line}`)].join("\n");
}

function importedName(specifier: string): string {
  return specifier.replace(/^type\s+/, "").trim().split(/\s+as\s+/)[0]?.trim() ?? "";
}

export function rewriteSource(source: string): RewriteResult {
  const packs = new Set<IconPack>();
  const issues: string[] = [];
  let output = source;

  if (/import\s+(?:type\s+)?\*\s+as\s+[$\w]+\s+from\s+(["'])sketchicon\1/.test(output)) {
    issues.push("namespace import from sketchicon");
  }
  if (/export\s+\*\s+as\s+[$\w]+\s+from\s+(["'])sketchicon\1/.test(output)) {
    issues.push("namespace re-export from sketchicon");
  }

  if (/(["'])sketchicon\/icons\//.test(output)) packs.add("lucide");
  if (/(["'])sketchicon\/hugeicons(?:\/|\1)/.test(output)) packs.add("hugeicons");

  output = output
    .replace(/(["'])sketchicon\/icons\//g, "$1@sketchicon/lucide/icons/")
    .replace(/(["'])sketchicon\/hugeicons\/icons\//g, "$1@sketchicon/hugeicons/icons/")
    .replace(/(["'])sketchicon\/hugeicons\1/g, "$1@sketchicon/hugeicons$1");

  output = output.replace(
    /(^|\n)([ \t]*)import\s+(type\s+)?\{([^}]+)\}\s+from\s+(["'])sketchicon\5;?/g,
    (statement, prefix: string, indent: string, typeKeyword: string | undefined, body: string) => {
      const specifiers = body.split(",").map((item) => item.trim()).filter(Boolean);
      const runtime = specifiers.filter((specifier) => runtimeRootExports.has(importedName(specifier)));
      const lucide = specifiers.filter((specifier) => !runtimeRootExports.has(importedName(specifier)));
      if (lucide.length === 0) return statement;

      packs.add("lucide");
      const keyword = typeKeyword ?? "";
      const lines = [];
      if (runtime.length > 0) lines.push(`${indent}import ${keyword}{ ${runtime.join(", ")} } from "sketchicon";`);
      lines.push(`${indent}import ${keyword}{ ${lucide.join(", ")} } from "@sketchicon/lucide";`);
      return `${prefix}${lines.join("\n")}`;
    },
  );

  output = output.replace(
    /(^|\n)([ \t]*)export\s+(type\s+)?\{([^}]+)\}\s+from\s+(["'])sketchicon\5;?/g,
    (statement, prefix: string, indent: string, typeKeyword: string | undefined, body: string) => {
      const specifiers = body.split(",").map((item) => item.trim()).filter(Boolean);
      const runtime = specifiers.filter((specifier) => runtimeRootExports.has(importedName(specifier)));
      const lucide = specifiers.filter((specifier) => !runtimeRootExports.has(importedName(specifier)));
      if (lucide.length === 0) return statement;

      packs.add("lucide");
      const keyword = typeKeyword ?? "";
      const lines = [];
      if (runtime.length > 0) lines.push(`${indent}export ${keyword}{ ${runtime.join(", ")} } from "sketchicon";`);
      lines.push(`${indent}export ${keyword}{ ${lucide.join(", ")} } from "@sketchicon/lucide";`);
      return `${prefix}${lines.join("\n")}`;
    },
  );

  output = output.replace(
    /(^|\n)([ \t]*)export\s+\*\s+from\s+(["'])sketchicon\3;?/g,
    (_statement, prefix: string, indent: string) => {
      packs.add("lucide");
      return `${prefix}${indent}export * from "sketchicon";\n${indent}export * from "@sketchicon/lucide";`;
    },
  );

  return { changed: output !== source, issues, packs, source: output };
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : sourceFiles(path.join(directory, entry.name));
    }
    return sourceExtensions.has(path.extname(entry.name)) ? [path.join(directory, entry.name)] : [];
  }));
  return files.flat();
}

export async function planMigration(projectRoot: string): Promise<MigrationPlan> {
  const edits: MigrationEdit[] = [];
  const issues: string[] = [];
  const packs = new Set<IconPack>();
  for (const file of await sourceFiles(projectRoot)) {
    const original = await readFile(file, "utf8");
    const rewritten = rewriteSource(original);
    rewritten.issues.forEach((issue) => issues.push(`${path.relative(projectRoot, file)}: ${issue}`));
    rewritten.packs.forEach((pack) => packs.add(pack));
    if (rewritten.changed) edits.push({ file, original, source: rewritten.source });
  }
  if (issues.length > 0) {
    throw new Error(
      `Cannot safely migrate namespace syntax:\n${issues.map((issue) => `  ${issue}`).join("\n")}\n` +
      "Replace it with named imports or exports, then rerun the migration.",
    );
  }
  return { edits, packs };
}

export async function applyMigrationPlan(plan: MigrationPlan): Promise<void> {
  await Promise.all(plan.edits.map((edit) => writeFile(edit.file, edit.source)));
}
