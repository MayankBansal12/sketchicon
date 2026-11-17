import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-native-"));
const archives = path.join(temporaryRoot, "archives");
const exec = promisify(execFile);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
async function run(command, args, cwd) {
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
  const packages = [];
  for (const workspace of ["@sketchicon/core", "sketchicon", "@sketchicon/lucide", "@sketchicon/hugeicons"]) {
    const { stdout } = await run(npm, ["pack", "--workspace", workspace, "--json", "--pack-destination", archives], root);
    packages.push(path.join(archives, JSON.parse(stdout)[0].filename));
  }
  for (const profile of ["minimum", "current"]) {
    const directory = path.join(temporaryRoot, profile);
    await cp(path.join(root, "tests", "native"), directory, { recursive: true });
    if (profile === "minimum") {
      const manifestPath = path.join(directory, "package.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      Object.assign(manifest.dependencies, {
        expo: "53.0.25", "@expo/metro-runtime": "5.0.5",
        react: "19.0.0", "react-dom": "19.0.0",
        "react-native": "0.79.6", "react-native-svg": "15.11.2", "react-native-web": "0.20.0",
      });
      manifest.devDependencies["react-test-renderer"] = "19.0.0";
      delete manifest.devDependencies["@react-native/jest-preset"];
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    console.log("Installing packed packages in an isolated Expo consumer...");
    await run(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...packages], directory);
    const fixture = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    const compatible = JSON.parse(await readFile(path.join(directory, "node_modules/expo/bundledNativeModules.json"), "utf8"));
    for (const name of ["react", "react-dom", "react-native", "react-native-svg"]) {
      assert.equal(fixture.dependencies[name], compatible[name], `${name} must match the Expo SDK fixture.`);
    }
    console.log("Checking native TypeScript props and rendering with real react-native-svg components...");
    await run(npm, ["exec", "--", "tsc", "--noEmit"], directory);
    const { stdout, stderr } = await run(npm, ["exec", "--", "jest", "--runInBand"], directory);
    console.log(stdout, stderr);
    console.log("Exporting production Expo bundles for Android, iOS, and web...");
    await run(npm, ["exec", "--", "expo", "export", "--platform", "all", "--max-workers", "2"], directory);
    for (const platform of ["android", "ios", "web"]) {
      const assets = await readdir(path.join(directory, "dist", "_expo", "static", "js", platform));
      assert.ok(assets.length > 0, `No ${platform} bundle was emitted.`);
    }
    console.log(`Verified packed native entry: Expo ${fixture.dependencies.expo}, React Native ${fixture.dependencies["react-native"]}, react-native-svg ${fixture.dependencies["react-native-svg"]}; native rendering, types, and Android/iOS/web Metro exports.`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
