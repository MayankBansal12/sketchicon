import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const packages = [
  { workspace: "@sketchicon/core", packed: 10_000, unpacked: 30_000 },
  { workspace: "sketchicon", packed: 15_000, unpacked: 50_000 },
  { workspace: "@sketchicon/lucide", packed: 250_000, unpacked: 1_500_000 },
  { workspace: "@sketchicon/hugeicons", packed: 1_800_000, unpacked: 7_000_000 },
  { workspace: "create-sketchicon", packed: 15_000, unpacked: 50_000 },
];

const packageReports = [];
for (const spec of packages) {
  const { stdout } = await exec(
    npm,
    ["pack", "--workspace", spec.workspace, "--dry-run", "--json"],
    { cwd: root, maxBuffer: 40 * 1024 * 1024 },
  );
  const [report] = JSON.parse(stdout);
  if (!report) throw new Error(`npm pack did not report ${spec.workspace}.`);
  if (report.size > spec.packed) {
    throw new Error(`${spec.workspace} is ${report.size} bytes packed; expected at most ${spec.packed}.`);
  }
  if (report.unpackedSize > spec.unpacked) {
    throw new Error(`${spec.workspace} is ${report.unpackedSize} bytes unpacked; expected at most ${spec.unpacked}.`);
  }
  packageReports.push(report);
}

const importChecks = [
  { label: "runtime root", file: "packages/runtime/dist/index.js", duration: 250, rss: 128 },
  { label: "runtime compatibility", file: "packages/runtime/dist/runtime.js", duration: 250, rss: 128 },
  { label: "core", file: "packages/core/dist/index.js", duration: 100, rss: 96 },
  { label: "Lucide direct icon", file: "packages/lucide/dist/icons/search.js", duration: 100, rss: 96 },
  { label: "Hugeicons direct icon", file: "packages/hugeicons/dist/icons/home-01.js", duration: 100, rss: 96 },
  { label: "Lucide barrel", file: "packages/lucide/dist/index.js", duration: 500, rss: 160 },
  { label: "Hugeicons barrel", file: "packages/hugeicons/dist/index.js", duration: 1_000, rss: 256 },
];

const importReports = [];
for (const check of importChecks) {
  const entry = pathToFileURL(path.join(root, check.file)).href;
  const probe = `
    import { performance } from "node:perf_hooks";
    const start = performance.now();
    await import(${JSON.stringify(entry)});
    console.log(JSON.stringify({ duration: performance.now() - start, rss: process.memoryUsage().rss }));
  `;
  const { stdout } = await exec(process.execPath, ["--input-type=module", "--eval", probe], { cwd: root });
  const report = JSON.parse(stdout);
  if (report.duration > check.duration) {
    throw new Error(`${check.label} import took ${report.duration.toFixed(1)}ms; expected at most ${check.duration}ms.`);
  }
  if (report.rss > check.rss * 1024 * 1024) {
    throw new Error(`${check.label} import used ${(report.rss / 1024 / 1024).toFixed(1)}MiB; expected at most ${check.rss}MiB.`);
  }
  importReports.push({ ...check, ...report });
}

console.log(
  `Verified five package budgets: ${packageReports.map((report) => `${report.name} ${report.size}B`).join(", ")}; imports: ${importReports.map((report) => `${report.label} ${report.duration.toFixed(1)}ms`).join(", ")}.`,
);
