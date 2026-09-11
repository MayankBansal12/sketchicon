import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-native-"));
const directory = path.join(temporaryRoot, "app");
const archives = path.join(temporaryRoot, "archives");
const exec = promisify(execFile);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
async function run(command, args, cwd = directory) {
  try {
    return await exec(command, args, {
      cwd, maxBuffer: 30 * 1024 * 1024,
      env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
    });
  } catch (error) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${error.stdout ?? ""}\n${error.stderr ?? ""}`, { cause: error });
  }
}

try {
  await mkdir(archives);
  await cp(path.join(root, "tests", "native"), directory, { recursive: true });
  const packages = [];
  for (const workspace of ["@sketchicon/core", "sketchicon", "@sketchicon/lucide", "@sketchicon/hugeicons"]) {
    const { stdout } = await run(npm, ["pack", "--workspace", workspace, "--json", "--pack-destination", archives], root);
    packages.push(path.join(archives, JSON.parse(stdout)[0].filename));
  }
  console.log("Installing packed packages in an isolated Expo consumer...");
  await run(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...packages]);
  const fixture = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  const compatible = JSON.parse(await readFile(path.join(directory, "node_modules/expo/bundledNativeModules.json"), "utf8"));
  for (const name of ["react", "react-dom", "react-native", "react-native-svg"]) {
    assert.equal(fixture.dependencies[name], compatible[name], `${name} must match the Expo SDK fixture.`);
  }
  console.log("Checking native TypeScript props and rendering with real react-native-svg components...");
  await run(npm, ["exec", "--", "tsc", "--noEmit"]);
  const { stdout, stderr } = await run(npm, ["exec", "--", "jest", "--runInBand"]);
  console.log(stdout, stderr);
  console.log("Exporting production Expo bundles for Android, iOS, and web...");
  await run(npm, ["exec", "--", "expo", "export", "--platform", "all", "--max-workers", "2"]);
  for (const platform of ["android", "ios", "web"]) {
    const assets = await readdir(path.join(directory, "dist", "_expo", "static", "js", platform));
    assert.ok(assets.length > 0, `No ${platform} bundle was emitted.`);
  }
  console.log(`Verified packed native entry: Expo ${fixture.dependencies.expo}, React Native ${fixture.dependencies["react-native"]}, react-native-svg ${fixture.dependencies["react-native-svg"]}; native rendering, types, and Android/iOS/web Metro exports.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
