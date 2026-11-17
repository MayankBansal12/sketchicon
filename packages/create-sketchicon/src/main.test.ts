import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn }));
import { runCli } from "./main.js";

const temporary: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  spawn.mockReset();
  await Promise.all(temporary.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function expoProject() {
  const directory = await mkdtemp(path.join(tmpdir(), "sketchicon-expo-cli-"));
  temporary.push(directory);
  await writeFile(path.join(directory, "package.json"), JSON.stringify({
    dependencies: { react: "19", "react-native": "0.86", expo: "57" },
  }));
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  spawn.mockImplementation(() => ({
    on(event: string, callback: (code: number) => void) {
      if (event === "exit") queueMicrotask(() => callback(0));
      return this;
    },
  }));
  return directory;
}

const cli = { commandName: "sketchicon" as const, packageUrl: import.meta.url };
describe("Expo installer execution", () => {
  it.each([
    ["npm", "npx", []], ["pnpm", "pnpm", ["exec"]],
    ["yarn", "yarn", ["exec"]], ["bun", "bunx", []],
  ] as const)("uses %s for the SDK-compatible SVG install", async (manager, runner, prefix) => {
    const cwd = await expoProject();
    await runCli(["--cwd", cwd, "--yes", "--package-manager", manager], cli);
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn.mock.calls[0]![1]).toEqual(expect.arrayContaining([expect.stringMatching(/^sketchicon@/)]));
    expect(spawn.mock.calls[1]).toEqual([
      runner, [...prefix, "expo", "install", "react-native-svg", `--${manager}`],
      expect.objectContaining({ cwd }),
    ]);
  });

  it("previews both commands without spawning either", async () => {
    const cwd = await expoProject();
    await runCli(["--cwd", cwd, "--yes", "--dry-run"], cli);
    expect(spawn).not.toHaveBeenCalled();
    expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining("expo install react-native-svg"));
  });

  it("stops when the package install fails", async () => {
    const cwd = await expoProject();
    spawn.mockImplementation(() => ({ on(event: string, callback: (code: number) => void) {
      if (event === "exit") queueMicrotask(() => callback(1));
      return this;
    } }));
    await expect(runCli(["--cwd", cwd, "--yes"], cli)).rejects.toThrow(/exit code 1/);
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});
