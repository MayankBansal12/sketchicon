import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as hugeiconExports from "@hugeicons/core-free-icons";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lucideRoot = path.join(root, "node_modules", "lucide-static");
const lucideIconsRoot = path.join(lucideRoot, "icons");
const hugeiconsRoot = path.join(root, "node_modules", "@hugeicons", "core-free-icons");
const outputLucideRoot = path.join(root, "packages", "lucide", "src");
const outputIconsRoot = path.join(outputLucideRoot, "icons");
const outputHugeiconsRoot = path.join(root, "packages", "hugeicons", "src");
const outputHugeiconFilesRoot = path.join(outputHugeiconsRoot, "icons");
const lucideReportPath = path.join(root, "packages", "lucide", "compatibility-report.json");
const hugeiconsReportPath = path.join(root, "packages", "hugeicons", "compatibility-report.json");
const websiteCatalogRoot = path.join(root, "apps", "web", "app", "generated");
const websiteCatalogChunksRoot = path.join(websiteCatalogRoot, "chunks");
const websiteCatalogPath = path.join(websiteCatalogRoot, "catalog.ts");
const websiteHugeiconsCatalogPath = path.join(websiteCatalogRoot, "hugeicons-catalog.ts");
const websiteCatalogLoadersPath = path.join(websiteCatalogRoot, "loaders.ts");
const websiteStatsPath = path.join(websiteCatalogRoot, "stats.ts");
const websitePublicIconsRoot = path.join(root, "apps", "web", "public", "icons");
const websiteMarkdownCatalogRoot = path.join(websitePublicIconsRoot, "catalog");
const websiteMarkdownCatalogPath = path.join(websitePublicIconsRoot, "catalog.md");
const websiteCatalogChunkTargetBytes = 120_000;
const webOnly = process.argv.includes("--web-only");
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
  const coordinates = String(value).trim().split(/[\s,]+/).filter(Boolean).map(Number);
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
  if (attribute.transform) throw new Error(`Unsupported transformed <${tag}> element`);
  if (attribute.opacity !== undefined && Number(attribute.opacity) !== 1) {
    throw new Error(`Unsupported opacity on <${tag}> element`);
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
      return { type: tag, points: points(attribute.points ?? "") };
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
  return { viewBox: rootAttributes.viewBox ?? "0 0 24 24", primitives };
}

function parseHugeicon(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("Icon contains no primitives");
  return {
    viewBox: "0 0 24 24",
    primitives: nodes.map((node) => {
      if (!Array.isArray(node) || node.length !== 2 || typeof node[0] !== "string") {
        throw new Error("Invalid Hugeicons node");
      }
      const attribute = node[1] ?? {};
      if (attribute.strokeWidth !== undefined && Number(attribute.strokeWidth) !== 1.5) {
        throw new Error(`Unsupported per-element strokeWidth: ${attribute.strokeWidth}`);
      }
      if (attribute.strokeLinecap !== undefined && attribute.strokeLinecap !== "round") {
        throw new Error(`Unsupported per-element strokeLinecap: ${attribute.strokeLinecap}`);
      }
      if (attribute.strokeLinejoin !== undefined && attribute.strokeLinejoin !== "round") {
        throw new Error(`Unsupported per-element strokeLinejoin: ${attribute.strokeLinejoin}`);
      }
      return parsePrimitive(node[0].toLowerCase(), attribute);
    }),
  };
}

function exportNameToSlug(exportName) {
  return exportName
    .replace(/Icon$/, "")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])(\d+)/g, "$1-$2")
    .replace(/(\d)([A-Za-z])/g, "$1-$2")
    .toLowerCase();
}

function geometryModule(provider, geometry) {
  return [
    `// Generated from ${provider}. Do not edit by hand.`,
    'import type { SketchGeometry } from "@sketchicon/core";',
    "",
    `const geometry: SketchGeometry = ${JSON.stringify(geometry)};`,
    "",
    "export default geometry;",
    "",
  ].join("\n");
}

async function readLucideExports() {
  const source = await readFile(path.join(lucideRoot, "dist", "esm", "lucide-static.mjs"), "utf8");
  const exportsByFile = new Map();
  for (const match of source.matchAll(/export \{ ([^}]+) \} from '\.\/icons\/([^']+)\.mjs';/g)) {
    exportsByFile.set(
      match[2],
      [...match[1].matchAll(/default as (\w+)/g)].map((name) => name[1]),
    );
  }
  return exportsByFile;
}

if (!webOnly) {
  await rm(outputIconsRoot, { recursive: true, force: true });
  await rm(outputHugeiconsRoot, { recursive: true, force: true });
}
await rm(websiteCatalogRoot, { recursive: true, force: true });
await rm(websiteMarkdownCatalogRoot, { recursive: true, force: true });
if (!webOnly) {
  await mkdir(outputIconsRoot, { recursive: true });
  await mkdir(outputHugeiconFilesRoot, { recursive: true });
}
await mkdir(websiteCatalogChunksRoot, { recursive: true });
await mkdir(websiteMarkdownCatalogRoot, { recursive: true });

const lucideExportsByFile = await readLucideExports();
const lucideFiles = (await readdir(lucideIconsRoot))
  .filter((file) => file.endsWith(".svg") && lucideExportsByFile.has(file.slice(0, -4)))
  .sort();
const lucideIncluded = [];
const lucideExcluded = [];
const catalog = [];
const lucideIndexLines = [
  "// Generated from lucide-static. Do not edit by hand.",
  'export type { SketchGeometry } from "@sketchicon/core";',
];

for (const file of lucideFiles) {
  const fileName = file.slice(0, -4);
  try {
    const geometry = parseSvg(await readFile(path.join(lucideIconsRoot, file), "utf8"));
    const aliases = lucideExportsByFile.get(fileName);
    if (!aliases?.length) throw new Error("Icon is missing public exports");
    if (!webOnly) {
      await writeFile(path.join(outputIconsRoot, `${fileName}.ts`), geometryModule("lucide-static", geometry));
      lucideIndexLines.push(
        `export { default as ${aliases.join(", default as ")} } from "./icons/${fileName}.js";`,
      );
    }
    const conventionalName = fileName.split("-")
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("");
    const exportName = aliases.includes(conventionalName) ? conventionalName : aliases[0];
    catalog.push({ aliases, exportName, fileName, geometry, provider: "lucide" });
    lucideIncluded.push(fileName);
  } catch (error) {
    lucideExcluded.push({
      icon: fileName,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

const hugeiconGroups = new Map();
for (const [exportName, nodes] of Object.entries(hugeiconExports)) {
  if (!exportName.endsWith("Icon") || exportName.endsWith("FreeIcons") || !Array.isArray(nodes)) continue;
  const key = JSON.stringify(nodes);
  const group = hugeiconGroups.get(key) ?? { aliases: [], nodes };
  group.aliases.push(exportName);
  hugeiconGroups.set(key, group);
}

const hugeiconsIncluded = [];
const hugeiconsExcluded = [];
const hugeiconsIndexLines = [
  "// Generated from @hugeicons/core-free-icons. Do not edit by hand.",
  'export type { SketchGeometry } from "@sketchicon/core";',
];
const usedHugeiconSlugs = new Set();

for (const { aliases, nodes } of [...hugeiconGroups.values()].sort((a, b) => a.aliases[0].localeCompare(b.aliases[0]))) {
  const exportName = aliases[0];
  let fileName = exportNameToSlug(exportName);
  if (usedHugeiconSlugs.has(fileName)) fileName = `${fileName}-icon`;
  usedHugeiconSlugs.add(fileName);
  try {
    const geometry = parseHugeicon(nodes);
    if (!webOnly) {
      await writeFile(
        path.join(outputHugeiconFilesRoot, `${fileName}.ts`),
        geometryModule("@hugeicons/core-free-icons", geometry),
      );
      hugeiconsIndexLines.push(
        `export { default as ${aliases.join(", default as ")} } from "./icons/${fileName}.js";`,
      );
    }
    catalog.push({ aliases, exportName, fileName, geometry, provider: "hugeicons" });
    hugeiconsIncluded.push(fileName);
  } catch (error) {
    hugeiconsExcluded.push({
      icon: fileName,
      aliases,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

if (!webOnly) {
  await writeFile(path.join(outputLucideRoot, "index.ts"), `${lucideIndexLines.join("\n")}\n`);
  await writeFile(path.join(outputHugeiconsRoot, "index.ts"), `${hugeiconsIndexLines.join("\n")}\n`);
  await writeFile(
    lucideReportPath,
    `${JSON.stringify({
      lucideVersion: JSON.parse(await readFile(path.join(lucideRoot, "package.json"), "utf8")).version,
      included: lucideIncluded.length,
      excluded: lucideExcluded,
    }, null, 2)}\n`,
  );
  await writeFile(
    hugeiconsReportPath,
    `${JSON.stringify({
      hugeiconsVersion: JSON.parse(await readFile(path.join(hugeiconsRoot, "package.json"), "utf8")).version,
      discoveredExports: Object.keys(hugeiconExports).length,
      discoveredIconNames: [...hugeiconGroups.values()].reduce((total, group) => total + group.aliases.length, 0),
      included: hugeiconsIncluded.length,
      excluded: hugeiconsExcluded,
    }, null, 2)}\n`,
  );
}

catalog.sort((a, b) => a.fileName.localeCompare(b.fileName) || a.provider.localeCompare(b.provider));
const initialCatalogChunk = catalog.filter((icon) => icon.provider === "lucide").slice(0, 48);
const initialCatalogIds = new Set(initialCatalogChunk.map((icon) => `${icon.provider}:${icon.fileName}`));
const catalogChunks = [initialCatalogChunk];
let currentChunk = [];
let currentChunkBytes = 0;
for (const icon of catalog.filter((item) => !initialCatalogIds.has(`${item.provider}:${item.fileName}`))) {
  const bytes = Buffer.byteLength(icon.exportName) + Buffer.byteLength(JSON.stringify(icon.geometry));
  if (currentChunk.length > 0 && currentChunkBytes + bytes > websiteCatalogChunkTargetBytes) {
    catalogChunks.push(currentChunk);
    currentChunk = [];
    currentChunkBytes = 0;
  }
  currentChunk.push(icon);
  currentChunkBytes += bytes;
}
if (currentChunk.length > 0) catalogChunks.push(currentChunk);
for (const [chunkId, chunk] of catalogChunks.entries()) {
  for (const icon of chunk) icon.chunkId = chunkId;
}

function catalogRecords(items) {
  return items.map(({ aliases, chunkId, exportName, fileName, provider }) =>
    `  [${JSON.stringify(provider)}, ${JSON.stringify(exportName)}, ${JSON.stringify(fileName)}, ${JSON.stringify(aliases.filter((alias) => alias !== exportName).join(" ").toLowerCase())}, ${chunkId}],`);
}

await writeFile(
  websiteCatalogPath,
  [
    "// Generated from Lucide and Hugeicons. Do not edit by hand.",
    'export type IconProvider = "lucide" | "hugeicons";',
    "export interface CatalogIconMetadata {",
    "  id: string;",
    "  provider: IconProvider;",
    "  name: string;",
    "  label: string;",
    "  searchText: string;",
    "  chunkId: number;",
    "}",
    "",
    "type CatalogIconRecord = readonly [provider: IconProvider, name: string, label: string, aliases: string, chunkId: number];",
    "",
    "const records: readonly CatalogIconRecord[] = [",
    ...catalogRecords(catalog.filter((icon) => icon.provider === "lucide")),
    "] as const;",
    "",
    "export const lucideCatalog: readonly CatalogIconMetadata[] = records.map(",
    "  ([provider, name, label, aliases, chunkId]) => ({",
    "    id: `${provider}:${label}` ,",
    "    provider,",
    "    name,",
    "    label,",
    "    searchText: `${label} ${name} ${aliases} ${provider}`.toLowerCase(),",
    "    chunkId,",
    "  }),",
    ");",
    "",
  ].join("\n"),
);

await writeFile(
  websiteHugeiconsCatalogPath,
  [
    "// Generated from Hugeicons. Do not edit by hand.",
    'import type { CatalogIconMetadata, IconProvider } from "./catalog.js";',
    "",
    "type CatalogIconRecord = readonly [provider: IconProvider, name: string, label: string, aliases: string, chunkId: number];",
    "",
    "const records: readonly CatalogIconRecord[] = [",
    ...catalogRecords(catalog.filter((icon) => icon.provider === "hugeicons")),
    "] as const;",
    "",
    "export const hugeiconsCatalog: readonly CatalogIconMetadata[] = records.map(",
    "  ([provider, name, label, aliases, chunkId]) => ({",
    "    id: `${provider}:${label}` ,",
    "    provider,",
    "    name,",
    "    label,",
    "    searchText: `${label} ${name} ${aliases} ${provider}`.toLowerCase(),",
    "    chunkId,",
    "  }),",
    ");",
    "",
  ].join("\n"),
);

for (const [index, chunk] of catalogChunks.entries()) {
  const chunkName = `catalog-${String(index).padStart(3, "0")}`;
  await writeFile(
    path.join(websiteCatalogChunksRoot, `${chunkName}.ts`),
    [
      "// Generated from Lucide and Hugeicons. Do not edit by hand.",
      'import type { SketchGeometry } from "sketchicon/core";',
      "",
      "export const geometries: Readonly<Record<string, SketchGeometry>> = {",
      ...chunk.map(({ exportName, fileName, geometry, provider }) =>
        `  ${JSON.stringify(`${provider}:${fileName}`)}: ${JSON.stringify(geometry)}, // ${exportName}`),
      "};",
      "",
    ].join("\n"),
  );
}

await writeFile(
  websiteCatalogLoadersPath,
  [
    "// Generated from Lucide and Hugeicons. Do not edit by hand.",
    'import type { SketchGeometry } from "sketchicon/core";',
    'import { geometries as initialGeometries } from "./chunks/catalog-000.js";',
    "",
    "export type CatalogGeometryChunk = Readonly<Record<string, SketchGeometry>>;",
    "export type CatalogGeometryLoader = () => Promise<CatalogGeometryChunk>;",
    "export { initialGeometries };",
    "",
    "export const catalogLoaders: readonly CatalogGeometryLoader[] = [",
    ...catalogChunks.map((_, index) => {
      const chunkName = `catalog-${String(index).padStart(3, "0")}`;
      return index === 0
        ? "  () => Promise.resolve(initialGeometries),"
        : `  () => import("./chunks/${chunkName}.js").then((module) => module.geometries),`;
    }),
    "];",
    "",
  ].join("\n"),
);

await writeFile(
  websiteStatsPath,
  [
    "// Generated from Lucide and Hugeicons. Do not edit by hand.",
    `export const iconCount = ${catalog.length};`,
    `export const formattedIconCount = ${JSON.stringify(catalog.length.toLocaleString("en-US"))};`,
    `export const providerCounts = ${JSON.stringify({ lucide: lucideIncluded.length, hugeicons: hugeiconsIncluded.length })} as const;`,
    "",
  ].join("\n"),
);

const markdownCatalogGroups = Map.groupBy(catalog, ({ fileName }) => {
  const initial = fileName.charAt(0).toLowerCase();
  return /[a-z]/.test(initial) ? initial : "other";
});
const markdownCatalogLinks = [];
for (const [initial, icons] of [...markdownCatalogGroups].sort(([a], [b]) => a.localeCompare(b))) {
  const title = initial === "other" ? "Other" : initial.toUpperCase();
  const fileName = `${initial}.md`;
  markdownCatalogLinks.push(`- [${title}](./catalog/${fileName}) (${icons.length} icons)`);
  await writeFile(
    path.join(websiteMarkdownCatalogRoot, fileName),
    [
      `# SketchIcon Catalog: ${title}`,
      "",
      "Each entry shows its provider and canonical named import.",
      "",
      ...icons.map(({ aliases, exportName, fileName: slug, provider }) => {
        const alternateAliases = aliases.filter((alias) => alias !== exportName);
        const aliasText = alternateAliases.length
          ? `; aliases: ${alternateAliases.map((alias) => `\`${alias}\``).join(", ")}`
          : "";
        const iconImport = `import { ${exportName} } from "@sketchicon/${provider}";`;
        return `- [${exportName}](/?provider=${provider}&icon=${slug}) - ${provider}; \`${iconImport}\`${aliasText}`;
      }),
      "",
      "[Back to the catalog index](../catalog.md)",
      "",
    ].join("\n"),
  );
}

await writeFile(
  websiteMarkdownCatalogPath,
  [
    "# SketchIcon Catalog",
    "",
    `SketchIcon includes ${catalog.length.toLocaleString("en-US")} compatible icons from Lucide and Hugeicons Core Free.`,
    "",
    "Each entry provides its provider, canonical named import, aliases, and an interactive preview.",
    "",
    "## Alphabetical Index",
    "",
    ...markdownCatalogLinks,
    "",
  ].join("\n"),
);

console.log(
  `Generated ${lucideIncluded.length} Lucide icons and ${hugeiconsIncluded.length} Hugeicons; excluded ${lucideExcluded.length + hugeiconsExcluded.length}.`,
);
