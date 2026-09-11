import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    external: ["@sketchicon/core"],
  },
  {
    entry: { browser: "src/index.ts" },
    format: ["esm"],
    platform: "browser",
    noExternal: [/.*/],
    minify: true,
  },
]);
