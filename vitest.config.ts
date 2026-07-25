import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@sketchicon/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@sketchicon/react": new URL("./packages/react/src/index.ts", import.meta.url).pathname,
      sketchicon: new URL("./packages/lucide/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    coverage: {
      include: ["packages/*/src/**/*.{ts,tsx}"],
    },
    include: ["packages/*/src/**/*.test.{ts,tsx}", "*.test.{ts,tsx}"],
  },
});
