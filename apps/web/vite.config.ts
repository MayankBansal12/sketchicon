import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const workspacePath = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: [
      {
        find: /^@sketchicon\/hugeicons\/icons\/(.+)$/,
        replacement: `${workspacePath("../../packages/hugeicons/src/icons/")}$1.ts`,
      },
      {
        find: /^@sketchicon\/hugeicons$/,
        replacement: workspacePath("../../packages/hugeicons/src/index.ts"),
      },
      {
        find: /^@sketchicon\/lucide\/icons\/(.+)$/,
        replacement: `${workspacePath("../../packages/lucide/src/icons/")}$1.ts`,
      },
      {
        find: /^sketchicon\/runtime$/,
        replacement: workspacePath("../../packages/runtime/src/SketchIcon.tsx"),
      },
      {
        find: /^sketchicon\/core$/,
        replacement: workspacePath("../../packages/runtime/src/core.ts"),
      },
      {
        find: "@sketchicon/core",
        replacement: workspacePath("../../packages/core/src/index.ts"),
      },
      {
        find: /^sketchicon$/,
        replacement: workspacePath("../../packages/runtime/src/index.ts"),
      },
    ],
  },
});
