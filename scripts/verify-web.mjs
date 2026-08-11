import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = path.join(root, "apps", "web", "build", "client");
const assetsRoot = path.join(clientRoot, "assets");
const iconDocsRoot = path.join(clientRoot, "icons");
const html = await readFile(path.join(clientRoot, "index.html"), "utf8");
const spaFallback = await readFile(path.join(clientRoot, "__spa-fallback.html"), "utf8");
const llmsText = await readFile(path.join(clientRoot, "llms.txt"), "utf8");
const usageDocs = await readFile(path.join(iconDocsRoot, "usage.md"), "utf8");
const catalogIndex = await readFile(path.join(iconDocsRoot, "catalog.md"), "utf8");
const compatibilityReport = JSON.parse(
  await readFile(path.join(root, "packages", "lucide", "compatibility-report.json"), "utf8"),
);
const hugeiconsCompatibilityReport = JSON.parse(
  await readFile(path.join(root, "packages", "hugeicons", "compatibility-report.json"), "utf8"),
);
const expectedIconCount = compatibilityReport.included + hugeiconsCompatibilityReport.included;
const formattedIconCount = expectedIconCount.toLocaleString("en-US");
const vercelConfig = JSON.parse(
  await readFile(path.join(root, "apps", "web", "vercel.json"), "utf8"),
);
const assets = await readdir(assetsRoot);
const runtimeSources = await Promise.all([
  readFile(path.join(root, "apps", "web", "app", "routes", "home.tsx"), "utf8"),
  readFile(path.join(root, "apps", "web", "app", "icon-library", "IconLibrary.tsx"), "utf8"),
]);

for (const source of runtimeSources) {
  if (/^import\s+(?!type\b)[^;]*\bSketchIcon\b[^;]*from\s+["']sketchicon["']/m.test(source)) {
    throw new Error("Web runtime imports SketchIcon from the Lucide root barrel.");
  }
}

for (const expected of [
  "Icons that feel",
  "Pick one. Make it yours.",
  "Preparing the icon library",
  `${formattedIconCount} deterministic, customizable hand-drawn SVG icons for React.`,
]) {
  if (!html.includes(expected)) throw new Error(`Prerendered HTML is missing: ${expected}`);
}

if (html.includes('id="root"')) {
  throw new Error("Website output regressed to an empty client-only application root.");
}

if (!spaFallback.includes('"isSpaMode":true')) {
  throw new Error("React Router SPA fallback was not generated correctly.");
}

if (!vercelConfig.rewrites?.some(({ destination }) => destination === "/__spa-fallback.html")) {
  throw new Error("Vercel is not configured to serve the React Router SPA fallback.");
}

for (const expected of ["/icons/usage.md", "/icons/catalog.md"]) {
  if (!llmsText.includes(expected)) throw new Error(`llms.txt is missing: ${expected}`);
}
if (!usageDocs.includes('from "@sketchicon/hugeicons"') || !usageDocs.includes("aria-hidden")) {
  throw new Error("Icon usage documentation is missing package or accessibility guidance.");
}

const catalogFiles = (await readdir(path.join(iconDocsRoot, "catalog")))
  .filter((file) => file.endsWith(".md"))
  .sort();
const documentedSlugs = new Set();

for (const file of catalogFiles) {
  if (!catalogIndex.includes(`(./catalog/${file})`)) {
    throw new Error(`Catalog index does not link to ${file}.`);
  }
  const source = await readFile(path.join(iconDocsRoot, "catalog", file), "utf8");
  for (const match of source.matchAll(/^- \[[^\]]+\]\(\/\?provider=(lucide|hugeicons)&icon=([^\)]+)\) - (lucide|hugeicons); `([^`]+)`/gm)) {
    const [, linkedProvider, linkedSlug, documentedProvider, importPath] = match;
    if (linkedProvider !== documentedProvider) throw new Error(`Mismatched catalog provider: ${linkedSlug}.`);
    if (!importPath.endsWith(`/${linkedSlug}`)) throw new Error(`Mismatched catalog slug: ${linkedSlug}.`);
    const id = `${linkedProvider}:${linkedSlug}`;
    if (documentedSlugs.has(id)) throw new Error(`Duplicate catalog icon: ${id}.`);
    documentedSlugs.add(id);
  }
}

if (documentedSlugs.size !== expectedIconCount) {
  throw new Error(
    `Documented ${documentedSlugs.size} icons; expected ${expectedIconCount}.`,
  );
}

const preloadedScripts = [...html.matchAll(/(?:modulepreload|script[^>]+type="module")[^>]+(?:href|src)="\/assets\/([^"]+\.js)"/g)]
  .map((match) => match[1]);
const initialCode = (
  await Promise.all(preloadedScripts.map((asset) => readFile(path.join(assetsRoot, asset))))
).reduce((size, code) => size + code.byteLength, 0);
const initialGzip = (
  await Promise.all(preloadedScripts.map(async (asset) => gzipSync(await readFile(path.join(assetsRoot, asset))).byteLength))
).reduce((size, bytes) => size + bytes, 0);

if (initialGzip > 130_000) {
  throw new Error(`Initial JavaScript is ${initialGzip} bytes gzip; expected at most 130000.`);
}

const catalogChunks = assets.filter((asset) => /^catalog-\d{3}-.*\.js$/.test(asset));
if (catalogChunks.length < 30 || catalogChunks.length > 60) {
  throw new Error(`Expected 30-60 byte-bounded catalog chunks; found ${catalogChunks.length}.`);
}

const iconLibraryAsset = assets.find((asset) => asset.startsWith("IconLibrary-") && asset.endsWith(".js"));
if (!iconLibraryAsset) {
  throw new Error("Icon library was not emitted as a lazy chunk.");
}
const iconLibraryGzip = gzipSync(await readFile(path.join(assetsRoot, iconLibraryAsset))).byteLength;
if (iconLibraryGzip > 28_000) {
  throw new Error(`Lazy icon library is ${iconLibraryGzip} bytes gzip; expected at most 28000.`);
}

const hugeiconsCatalogAsset = assets.find((asset) => asset.startsWith("hugeicons-catalog-") && asset.endsWith(".js"));
if (!hugeiconsCatalogAsset) throw new Error("Hugeicons metadata was not emitted separately.");
const hugeiconsCatalogGzip = gzipSync(await readFile(path.join(assetsRoot, hugeiconsCatalogAsset))).byteLength;
if (hugeiconsCatalogGzip > 60_000) {
  throw new Error(`Hugeicons metadata is ${hugeiconsCatalogGzip} bytes gzip; expected at most 60000.`);
}

console.log(
  `Verified prerendered website: ${initialCode} initial JS bytes (${initialGzip} gzip), ${iconLibraryGzip} gzip lazy library, ${hugeiconsCatalogGzip} gzip Hugeicons metadata, ${catalogChunks.length} catalog chunks, ${documentedSlugs.size} documented icons.`,
);
