import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  applyMigrationPlan,
  detectPackageManager,
  formatMigrationDiff,
  hasSketchiconV1,
  includeMigrationPacks,
  installCommand,
  parseArgs,
  planMigration,
  rewriteSource,
} from "./lib.js";

describe("create-sketchicon", () => {
  it("parses non-interactive installation flags", () => {
    expect(parseArgs(["--packs", "lucide,hugeicons", "--package-manager", "pnpm", "--yes"]))
      .toMatchObject({ packageManager: "pnpm", packs: ["lucide", "hugeicons"], yes: true });
  });

  it("constructs commands for supported package managers", () => {
    expect(installCommand("npm", ["lucide"])).toEqual([
      "npm",
      ["install", "sketchicon", "@sketchicon/lucide"],
    ]);
    expect(installCommand("bun", ["hugeicons"])).toEqual([
      "bun",
      ["add", "sketchicon", "@sketchicon/hugeicons"],
    ]);
  });

  it("always includes packs required by migration", () => {
    expect(includeMigrationPacks(["hugeicons"], new Set(["lucide"])))
      .toEqual(["hugeicons", "lucide"]);
  });

  it("detects a 0.1 project that needs automatic migration", () => {
    expect(hasSketchiconV1({ dependencies: { sketchicon: "^0.1.5" } })).toBe(true);
    expect(hasSketchiconV1({ dependencies: { sketchicon: "^0.2.0" } })).toBe(false);
    expect(hasSketchiconV1({})).toBe(false);
  });

  it("prefers an existing lockfile over the launcher user-agent", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "create-sketchicon-manager-test-"));
    try {
      await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
      expect(await detectPackageManager(root, {}, "npm/10.8.2 node/v22.22.0"))
        .toBe("pnpm");
      expect(await detectPackageManager(root, { packageManager: "yarn@4.9.2" }, "npm/10.8.2"))
        .toBe("yarn");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("migrates root, direct Lucide, and Hugeicons imports", () => {
    const result = rewriteSource([
      'import { Search, SketchIcon, type SketchGeometry } from "sketchicon";',
      'import Check from "sketchicon/icons/check";',
      'import { Home01Icon } from "sketchicon/hugeicons";',
      'import HomeDirect from "sketchicon/hugeicons/icons/home-01";',
      "",
    ].join("\n"));

    expect(result.source).toContain('import { SketchIcon, type SketchGeometry } from "sketchicon";');
    expect(result.source).toContain('import { Search } from "@sketchicon/lucide";');
    expect(result.source).toContain('from "@sketchicon/lucide/icons/check"');
    expect(result.source).toContain('from "@sketchicon/hugeicons"');
    expect(result.source).toContain('from "@sketchicon/hugeicons/icons/home-01"');
    expect([...result.packs]).toEqual(["lucide", "hugeicons"]);
  });

  it("leaves runtime-only imports unchanged", () => {
    const source = 'import { SketchIcon, type SketchIconProps } from "sketchicon";\n';
    expect(rewriteSource(source)).toMatchObject({ changed: false, source });
  });

  it("migrates named and star re-exports from the root package", () => {
    const result = rewriteSource([
      'export { Search as SearchIcon, SketchIcon, type SketchGeometry } from "sketchicon";',
      'export * from "sketchicon";',
      "",
    ].join("\n"));

    expect(result.source).toContain(
      'export { SketchIcon, type SketchGeometry } from "sketchicon";',
    );
    expect(result.source).toContain(
      'export { Search as SearchIcon } from "@sketchicon/lucide";',
    );
    expect(result.source).toContain('export * from "@sketchicon/lucide";');
    expect([...result.packs]).toEqual(["lucide"]);
  });

  it("reports namespace imports and re-exports that cannot be split safely", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "create-sketchicon-namespace-test-"));
    try {
      await writeFile(path.join(root, "namespace.ts"), [
        'import * as icons from "sketchicon";',
        'export * as allIcons from "sketchicon";',
        "",
      ].join("\n"));

      await expect(planMigration(root)).rejects.toThrow(/namespace\.ts: namespace import/);
      await expect(planMigration(root)).rejects.toThrow(/namespace re-export/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("plans and applies migration edits while ignoring build output", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "create-sketchicon-test-"));
    try {
      await mkdir(path.join(root, "src"));
      await mkdir(path.join(root, "dist"));
      const sourceFile = path.join(root, "src", "icon.tsx");
      const generatedFile = path.join(root, "dist", "icon.js");
      await writeFile(sourceFile, 'import Search from "sketchicon/icons/search";\n');
      await writeFile(generatedFile, 'import Search from "sketchicon/icons/search";\n');

      const plan = await planMigration(root);
      expect(plan.edits.map(({ file }) => file)).toEqual([sourceFile]);
      expect(formatMigrationDiff(plan.edits[0]!, "src/icon.tsx")).toContain([
        "--- src/icon.tsx",
        "+++ src/icon.tsx",
        '-import Search from "sketchicon/icons/search";',
        '+import Search from "@sketchicon/lucide/icons/search";',
      ].join("\n"));
      await applyMigrationPlan(plan);

      expect(await readFile(sourceFile, "utf8")).toContain("@sketchicon/lucide/icons/search");
      expect(await readFile(generatedFile, "utf8")).toContain("sketchicon/icons/search");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
