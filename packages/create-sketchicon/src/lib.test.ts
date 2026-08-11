import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { applyMigrationPlan, installCommand, parseArgs, planMigration, rewriteSource } from "./lib.js";

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
      await applyMigrationPlan(plan);

      expect(await readFile(sourceFile, "utf8")).toContain("@sketchicon/lucide/icons/search");
      expect(await readFile(generatedFile, "utf8")).toContain("sketchicon/icons/search");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
