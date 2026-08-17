import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SketchIcon } from "../packages/runtime/dist/runtime.js";

const iconRoots = [
  path.resolve("packages/lucide/dist/icons"),
  path.resolve("packages/hugeicons/dist/icons"),
];
let verified = 0;

for (const iconsRoot of iconRoots) {
  const files = (await readdir(iconsRoot)).filter((file) => file.endsWith(".js")).sort();
  for (const file of files) {
    const module = await import(pathToFileURL(path.join(iconsRoot, file)).href);
    const markup = renderToStaticMarkup(createElement(SketchIcon, { icon: module.default }));

    if (!markup.startsWith("<svg") || /(?:NaN|Infinity)/.test(markup)) {
      throw new Error(`Invalid rendered output for ${file}`);
    }
    verified += 1;
  }
}

console.log(`Rendered and verified ${verified} generated icons.`);
