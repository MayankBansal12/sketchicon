import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const workspacePath = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: [
      {
        find: /^sketchicon\/icons\/(.+)$/,
        replacement: `${workspacePath("../../packages/lucide/src/icons/")}$1.ts`,
      },
      {
        find: /^sketchicon\/runtime$/,
        replacement: workspacePath("../../packages/lucide/src/SketchIcon.tsx"),
      },
      {
        find: /^sketchicon\/core$/,
        replacement: workspacePath("../../packages/lucide/src/core.ts"),
      },
      {
        find: "@sketchicon/core",
        replacement: workspacePath("../../packages/core/src/index.ts"),
      },
      {
        find: /^sketchicon$/,
        replacement: workspacePath("../../packages/lucide/src/index.ts"),
      },
    ],
  },
});
