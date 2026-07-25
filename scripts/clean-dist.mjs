import { rm } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("dist");

if (path.basename(output) !== "dist") {
  throw new Error(`Refusing to clean unexpected directory: ${output}`);
}

await rm(output, { recursive: true, force: true });
