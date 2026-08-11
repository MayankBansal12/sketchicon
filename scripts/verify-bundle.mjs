import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const byteLimit = 35_000;
const gzipLimit = 10_000;

async function verify(entryName) {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: "esbuild",
      lib: {
        entry: path.join(root, "scripts", "fixtures", entryName),
        formats: ["es"],
      },
      rollupOptions: {
        external: ["react", "react/jsx-runtime"],
      },
    },
  });
  const builds = Array.isArray(result) ? result : [result];
  const code = builds.flatMap((buildResult) => buildResult.output)
    .filter((output) => output.type === "chunk")
    .map((output) => output.code)
    .join("\n");
  const bytes = Buffer.byteLength(code);
  const gzipBytes = gzipSync(code).byteLength;
  if (bytes > byteLimit || gzipBytes > gzipLimit) {
    throw new Error(
      `${entryName} bundle is ${bytes} bytes (${gzipBytes} gzip); expected at most ${byteLimit} bytes (${gzipLimit} gzip).`,
    );
  }
  return { bytes, gzipBytes };
}

const lucide = await verify("single-icon.js");
const hugeicons = await verify("single-hugeicon.js");
console.log(
  `Verified tree-shaken bundles: Lucide ${lucide.bytes} bytes (${lucide.gzipBytes} gzip), Hugeicons ${hugeicons.bytes} bytes (${hugeicons.gzipBytes} gzip).`,
);
