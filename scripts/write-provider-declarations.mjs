import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const packageRoot = process.cwd();
const source = await readFile(path.join(packageRoot, "src", "index.ts"), "utf8");
const declarations = [
  'import type { SketchGeometry } from "@sketchicon/core";',
  'export type { SketchGeometry } from "@sketchicon/core";',
];
for (const line of source.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("export type {")) continue;
  if (!line.startsWith("export {")) {
    throw new Error(`Provider index contains an unsupported statement: ${line}`);
  }
  const match = line.match(/^export \{ (.+) \} from "\.\/icons\/.+\.js";$/);
  if (!match) throw new Error(`Unsupported provider export: ${line}`);
  const names = match[1].split(", ").map((member) => {
    const name = member.match(/^default as (\w+)$/)?.[1];
    if (!name) throw new Error(`Unsupported provider export member: ${member}`);
    return `${name}: SketchGeometry`;
  });
  declarations.push(`export declare const ${names.join(", ")};`);
}
await writeFile(path.join(packageRoot, "dist", "index.d.ts"), `${declarations.join("\n")}\n`);
await writeFile(
  path.join(packageRoot, "dist", "icon.d.ts"),
  [
    'import type { SketchGeometry } from "@sketchicon/core";',
    "declare const geometry: SketchGeometry;",
    "export default geometry;",
    "",
  ].join("\n"),
);
