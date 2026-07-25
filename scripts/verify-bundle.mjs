import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "scripts", "fixtures", "single-icon.js");

const result = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    write: false,
    minify: "esbuild",
    lib: {
      entry,
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
const byteLimit = 35_000;
const gzipLimit = 10_000;

if (bytes > byteLimit || gzipBytes > gzipLimit) {
  throw new Error(
    `Single-icon bundle is ${bytes} bytes (${gzipBytes} gzip); expected at most ${byteLimit} bytes (${gzipLimit} gzip).`,
  );
}

console.log(`Verified tree-shaken single-icon bundle: ${bytes} bytes (${gzipBytes} gzip).`);
