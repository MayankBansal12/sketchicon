import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = path.join(root, "apps", "web", "build", "client");
const assetsRoot = path.join(clientRoot, "assets");
const html = await readFile(path.join(clientRoot, "index.html"), "utf8");
const assets = await readdir(assetsRoot);

for (const expected of [
  "Icons that feel",
  "Pick one. Make it yours.",
  "Preparing the icon library",
  "1,739 deterministic, customizable hand-drawn SVG icons for React.",
]) {
  if (!html.includes(expected)) throw new Error(`Prerendered HTML is missing: ${expected}`);
}

if (html.includes('id="root"')) {
  throw new Error("Website output regressed to an empty client-only application root.");
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
if (catalogChunks.length < 10 || catalogChunks.length > 30) {
  throw new Error(`Expected 10-30 coarse catalog chunks; found ${catalogChunks.length}.`);
}

if (!assets.some((asset) => asset.startsWith("IconLibrary-") && asset.endsWith(".js"))) {
  throw new Error("Icon library was not emitted as a lazy chunk.");
}

console.log(
  `Verified prerendered website: ${initialCode} initial JS bytes (${initialGzip} gzip), ${catalogChunks.length} catalog chunks.`,
);
