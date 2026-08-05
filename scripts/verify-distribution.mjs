import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDist = path.join(root, "packages", "lucide", "dist");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const PACKED_SIZE_LIMIT = 220_000;
const UNPACKED_SIZE_LIMIT = 1_150_000;
const importChecks = [
  { label: "root", file: "index.js", durationLimitMs: 500, rssLimitBytes: 128 * 1024 * 1024 },
  { label: "runtime", file: "runtime.js", durationLimitMs: 250, rssLimitBytes: 128 * 1024 * 1024 },
  { label: "direct icon", file: "icons/search.js", durationLimitMs: 100, rssLimitBytes: 96 * 1024 * 1024 },
];

const { stdout: packOutput } = await execFileAsync(
  npm,
  ["pack", "--workspace", "sketchicon", "--dry-run", "--json"],
  { cwd: root, maxBuffer: 20 * 1024 * 1024 },
);
const [packageReport] = JSON.parse(packOutput);

if (!packageReport) throw new Error("npm pack did not return a package report.");
if (packageReport.size > PACKED_SIZE_LIMIT) {
  throw new Error(
    `Packed sketchicon size is ${packageReport.size} bytes; expected at most ${PACKED_SIZE_LIMIT}.`,
  );
}
if (packageReport.unpackedSize > UNPACKED_SIZE_LIMIT) {
  throw new Error(
    `Unpacked sketchicon size is ${packageReport.unpackedSize} bytes; expected at most ${UNPACKED_SIZE_LIMIT}.`,
  );
}

const importReports = [];
for (const check of importChecks) {
  const entry = path.join(packageDist, check.file);
  const importProbe = `
    import { performance } from "node:perf_hooks";
    const start = performance.now();
    await import(${JSON.stringify(pathToFileURL(entry).href)});
    console.log(JSON.stringify({
      durationMs: performance.now() - start,
      rssBytes: process.memoryUsage().rss,
    }));
  `;
  const { stdout: importOutput } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "--eval", importProbe],
    { cwd: root },
  );
  const report = JSON.parse(importOutput);

  if (report.durationMs > check.durationLimitMs) {
    throw new Error(
      `Native ${check.label} import took ${report.durationMs.toFixed(1)}ms; expected at most ${check.durationLimitMs}ms.`,
    );
  }
  if (report.rssBytes > check.rssLimitBytes) {
    throw new Error(
      `Native ${check.label} import used ${report.rssBytes} bytes RSS; expected at most ${check.rssLimitBytes}.`,
    );
  }
  importReports.push({ ...report, label: check.label });
}

console.log(
  `Verified distribution: ${packageReport.size} bytes packed, ${packageReport.unpackedSize} unpacked; ${importReports.map((report) => `${report.label} import ${report.durationMs.toFixed(1)}ms/${(report.rssBytes / 1024 / 1024).toFixed(1)}MiB`).join(", ")}.`,
);
