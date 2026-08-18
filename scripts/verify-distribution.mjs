import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const packages = [
  { workspace: "@sketchicon/core", packed: 5_000, unpacked: 15_000, files: 4 },
  { workspace: "sketchicon", packed: 5_000, unpacked: 15_000, files: 13 },
  { workspace: "@sketchicon/lucide", packed: 165_000, unpacked: 900_000, files: 1_750 },
  { workspace: "@sketchicon/hugeicons", packed: 1_450_000, unpacked: 5_500_000, files: 5_320 },
  { workspace: "create-sketchicon", packed: 8_000, unpacked: 30_000, files: 5 },
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
  if (report.files.length > spec.files) {
    throw new Error(`${spec.workspace} contains ${report.files.length} files; expected at most ${spec.files}.`);
  }
  packageReports.push(report);
}

const importChecks = [
  { label: "runtime root", file: "packages/runtime/dist/index.js", duration: 100, rss: 128 },
  { label: "runtime compatibility", file: "packages/runtime/dist/runtime.js", duration: 100, rss: 128 },
  { label: "runtime server", file: "packages/runtime/dist/server.js", duration: 100, rss: 128 },
  { label: "core", file: "packages/core/dist/index.js", duration: 50, rss: 96 },
  { label: "Lucide direct icon", file: "packages/lucide/dist/icons/search.js", duration: 50, rss: 96 },
  { label: "Hugeicons direct icon", file: "packages/hugeicons/dist/icons/home-01.js", duration: 50, rss: 96 },
  { label: "Lucide barrel", file: "packages/lucide/dist/index.js", duration: 400, rss: 160 },
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
  const samples = [];
  for (let index = 0; index < 3; index += 1) {
    const { stdout } = await exec(process.execPath, ["--input-type=module", "--eval", probe], { cwd: root });
    samples.push(JSON.parse(stdout));
  }
  samples.sort((a, b) => a.duration - b.duration);
  const report = {
    duration: samples[1].duration,
    rss: Math.max(...samples.map((sample) => sample.rss)),
  };
  if (report.duration > check.duration) {
    throw new Error(`${check.label} import took ${report.duration.toFixed(1)}ms; expected at most ${check.duration}ms.`);
  }
  if (report.rss > check.rss * 1024 * 1024) {
    throw new Error(`${check.label} import used ${(report.rss / 1024 / 1024).toFixed(1)}MiB; expected at most ${check.rss}MiB.`);
  }
  importReports.push({ ...check, ...report });
}

console.log(
  `Verified five package budgets: ${packageReports.map((report) => `${report.name} ${report.size}B/${report.files.length} files`).join(", ")}; imports: ${importReports.map((report) => `${report.label} ${report.duration.toFixed(1)}ms`).join(", ")}.`,
);
