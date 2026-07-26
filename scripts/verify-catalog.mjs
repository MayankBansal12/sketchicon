import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SketchIcon } from "../packages/lucide/dist/runtime.js";

const iconsRoot = path.resolve("packages/lucide/dist/icons");
const files = (await readdir(iconsRoot)).filter((file) => file.endsWith(".js")).sort();

for (const file of files) {
  const module = await import(pathToFileURL(path.join(iconsRoot, file)).href);
  const markup = renderToStaticMarkup(createElement(SketchIcon, { icon: module.default }));

  if (!markup.startsWith("<svg") || /(?:NaN|Infinity)/.test(markup)) {
    throw new Error(`Invalid rendered output for ${file}`);
  }
}

console.log(`Rendered and verified ${files.length} generated icons.`);
