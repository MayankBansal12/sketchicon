import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedEntries = [
  path.join(root, "packages", "lucide", "src", "index.ts"),
  path.join(root, "packages", "hugeicons", "src", "index.ts"),
];

try {
  await Promise.all(generatedEntries.map((file) => access(file)));
} catch {
  await import("./generate-icons.mjs");
}
