import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lucideRoot = path.join(root, "node_modules", "lucide-static");
const iconsRoot = path.join(lucideRoot, "icons");
const outputRoot = path.join(root, "packages", "lucide", "src");
const outputIconsRoot = path.join(outputRoot, "icons");
const reportPath = path.join(root, "packages", "lucide", "compatibility-report.json");
const supportedTags = new Set([
  "svg",
  "path",
  "line",
  "polyline",
  "polygon",
  "circle",
  "ellipse",
  "rect",
]);

function attributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
}

function number(attribute, name, fallback) {
  const value = attribute[name];
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${name} value: ${value}`);
  return parsed;
}

function optionalNumber(attribute, name) {
  return attribute[name] === undefined ? undefined : number(attribute, name);
}

function points(value) {
  const coordinates = value.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if (
    coordinates.length < 4 ||
    coordinates.length % 2 !== 0 ||
    coordinates.some((coordinate) => !Number.isFinite(coordinate))
  ) {
    throw new Error("Invalid polyline or polygon points");
  }
  return coordinates;
}

function parsePrimitive(tag, attribute) {
  if (attribute.fill && attribute.fill !== "none") {
    throw new Error(`Unsupported filled <${tag}> element`);
  }

  switch (tag) {
    case "path":
      if (!attribute.d) throw new Error("Path is missing d");
      return { type: "path", d: attribute.d };
    case "line":
      return {
        type: "line",
        x1: number(attribute, "x1", 0),
        y1: number(attribute, "y1", 0),
        x2: number(attribute, "x2", 0),
        y2: number(attribute, "y2", 0),
      };
    case "polyline":
    case "polygon":
      return {
        type: tag,
        points: points(attribute.points ?? ""),
      };
    case "circle":
      return {
        type: "circle",
        cx: number(attribute, "cx", 0),
        cy: number(attribute, "cy", 0),
        r: number(attribute, "r"),
      };
    case "ellipse":
      return {
        type: "ellipse",
        cx: number(attribute, "cx", 0),
        cy: number(attribute, "cy", 0),
        rx: number(attribute, "rx"),
        ry: number(attribute, "ry"),
      };
    case "rect":
      return {
        type: "rect",
        x: number(attribute, "x", 0),
        y: number(attribute, "y", 0),
        width: number(attribute, "width"),
        height: number(attribute, "height"),
        ...(attribute.rx === undefined ? {} : { rx: optionalNumber(attribute, "rx") }),
        ...(attribute.ry === undefined ? {} : { ry: optionalNumber(attribute, "ry") }),
      };
    default:
      throw new Error(`Unsupported <${tag}> element`);
  }
}

function parseSvg(source) {
  const tags = [...source.matchAll(/<\/?([a-z][\w:-]*)\b/gi)].map((match) =>
    match[1].toLowerCase(),
  );
  const unsupported = tags.find((tag) => !supportedTags.has(tag));
  if (unsupported) throw new Error(`Unsupported <${unsupported}> element`);

  const rootMatch = source.match(/<svg\b([^>]*)>/i);
  if (!rootMatch) throw new Error("Missing SVG root");
  const rootAttributes = attributes(rootMatch[1]);
  const primitives = [...source.matchAll(/<(path|line|polyline|polygon|circle|ellipse|rect)\b([^>]*)\/>/gi)]
    .map((match) => parsePrimitive(match[1].toLowerCase(), attributes(match[2])));

  if (primitives.length === 0) throw new Error("SVG contains no supported primitives");
  return {
    viewBox: rootAttributes.viewBox ?? "0 0 24 24",
    primitives,
  };
}

async function readExports() {
  const source = await readFile(
    path.join(lucideRoot, "dist", "esm", "lucide-static.mjs"),
    "utf8",
  );
  const exportsByFile = new Map();

  for (const match of source.matchAll(/export \{ ([^}]+) \} from '\.\/icons\/([^']+)\.mjs';/g)) {
    const names = [...match[1].matchAll(/default as (\w+)/g)].map((name) => name[1]);
    exportsByFile.set(match[2], names);
  }

  return exportsByFile;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputIconsRoot, { recursive: true });

const exportsByFile = await readExports();
const files = (await readdir(iconsRoot))
  .filter((file) => file.endsWith(".svg") && exportsByFile.has(file.slice(0, -4)))
  .sort();
const included = [];
const excluded = [];
const indexLines = [
  "// Generated from lucide-static. Do not edit by hand.",
  'export { SketchIcon } from "./runtime.js";',
  'export type { SketchIconProps } from "./runtime.js";',
  'export type { SketchGeometry } from "./core.js";',
];

for (const file of files) {
  const fileName = file.slice(0, -4);
  try {
    const geometry = parseSvg(await readFile(path.join(iconsRoot, file), "utf8"));
    const aliases = exportsByFile.get(fileName);
    if (!aliases?.length) throw new Error("Icon is missing public exports");
    const moduleSource = [
      "// Generated from lucide-static. Do not edit by hand.",
      'import type { SketchGeometry } from "../core.js";',
      "",
      `const geometry: SketchGeometry = ${JSON.stringify(geometry)};`,
      "",
      "export default geometry;",
      "",
    ].join("\n");

    await writeFile(path.join(outputIconsRoot, `${fileName}.ts`), moduleSource);
    indexLines.push(
      `export { default as ${aliases.join(", default as ")} } from "./icons/${fileName}.js";`,
    );
    included.push(fileName);
  } catch (error) {
    excluded.push({
      icon: fileName,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

await writeFile(path.join(outputRoot, "index.ts"), `${indexLines.join("\n")}\n`);
await writeFile(
  path.join(outputRoot, "core.ts"),
  'export * from "@sketchicon/core";\n',
);
await writeFile(
  path.join(outputRoot, "runtime.ts"),
  [
    'export { SketchIcon } from "@sketchicon/react";',
    'export type { SketchIconProps } from "@sketchicon/react";',
    "",
  ].join("\n"),
);
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      lucideVersion: JSON.parse(
        await readFile(path.join(lucideRoot, "package.json"), "utf8"),
      ).version,
      included: included.length,
      excluded,
    },
    null,
    2,
  )}\n`,
);

console.log(`Generated ${included.length} icons; excluded ${excluded.length}.`);
