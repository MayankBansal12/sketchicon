import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const byteLimit = 34_000;
const gzipLimit = 9_800;

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
const lucideDirect = await verify("single-icon-direct.js");
const server = await verify("single-icon-server.js");
const hugeicons = await verify("single-hugeicon.js");
const hugeiconsDirect = await verify("single-hugeicon-direct.js");

for (const [provider, barrel, direct] of [
  ["Lucide", lucide, lucideDirect],
  ["Hugeicons", hugeicons, hugeiconsDirect],
]) {
  if (Math.abs(barrel.bytes - direct.bytes) > 250) {
    throw new Error(`${provider} barrel tree shaking differs from its direct bundle by more than 250 bytes.`);
  }
}
console.log(
  `Verified tree-shaken barrel/direct/server bundles: Lucide ${lucide.bytes}/${lucideDirect.bytes} bytes (${lucide.gzipBytes}/${lucideDirect.gzipBytes} gzip), Hugeicons ${hugeicons.bytes}/${hugeiconsDirect.bytes} bytes (${hugeicons.gzipBytes}/${hugeiconsDirect.gzipBytes} gzip), server ${server.bytes} bytes (${server.gzipBytes} gzip).`,
);
