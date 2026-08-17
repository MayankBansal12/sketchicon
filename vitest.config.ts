import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@sketchicon\/hugeicons\/icons\/(.+)$/,
        replacement: `${new URL("./packages/hugeicons/src/icons/", import.meta.url).pathname}$1.ts`,
      },
      {
        find: /^@sketchicon\/hugeicons$/,
        replacement: new URL("./packages/hugeicons/src/index.ts", import.meta.url).pathname,
      },
      {
        find: /^@sketchicon\/lucide\/icons\/(.+)$/,
        replacement: `${new URL("./packages/lucide/src/icons/", import.meta.url).pathname}$1.ts`,
      },
      {
        find: /^@sketchicon\/lucide$/,
        replacement: new URL("./packages/lucide/src/index.ts", import.meta.url).pathname,
      },
      {
        find: "@sketchicon/core",
        replacement: new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      },
      {
        find: "sketchicon/core",
        replacement: new URL("./packages/runtime/src/core.ts", import.meta.url).pathname,
      },
      {
        find: "sketchicon/runtime",
        replacement: new URL("./packages/runtime/src/runtime.ts", import.meta.url).pathname,
      },
      {
        find: /^sketchicon$/,
        replacement: new URL("./packages/runtime/src/index.ts", import.meta.url).pathname,
      },
    ],
  },
  test: {
    coverage: {
      include: ["packages/*/src/**/*.{ts,tsx}"],
    },
    include: [
      "packages/*/src/**/*.test.{ts,tsx}",
      "apps/web/app/**/*.test.{ts,tsx}",
      "*.test.{ts,tsx}",
    ],
  },
});
