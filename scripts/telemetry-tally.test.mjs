import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./telemetry-tally.mjs", import.meta.url));

function runTally(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, BLOB_READ_WRITE_TOKEN: "" },
  });
}

describe("telemetry tally arguments", () => {
  it("accepts --json without treating it as a date", () => {
    const result = runTally(["--json"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing BLOB_READ_WRITE_TOKEN");
    expect(result.stderr).not.toContain("Invalid --since date");
  });

  it.each([
    ["separate", ["--since", "2026-08-01"]],
    ["equals", ["--since=2026-08-01"]],
  ])("accepts the %s --since form", (_name, args) => {
    const result = runTally(args);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing BLOB_READ_WRITE_TOKEN");
  });

  it.each([
    [["--since"]],
    [["--since", "--json"]],
    [["--since=2026-02-30"]],
    [["--since=August-1"]],
  ])("rejects an invalid date argument: %j", (args) => {
    const result = runTally(args);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/--since (requires|date)/);
  });

  it("rejects unknown arguments", () => {
    const result = runTally(["--verbose"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown argument: --verbose");
  });
});
