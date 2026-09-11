import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";
import { build } from "vite";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "sketchicon-adapters-"));
const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const browserMode = process.argv.includes("--browser");
let browser;
let server;

async function write(directory, name, content) {
  await writeFile(path.join(directory, name), content);
}
async function pack(name) {
  const { stdout } = await exec(npm, ["pack", "--workspace", name, "--json", "--pack-destination", temporaryRoot], {
    cwd: root, maxBuffer: 32 * 1024 * 1024,
  });
  return path.join(temporaryRoot, JSON.parse(stdout)[0].filename);
}
async function consumer(framework, archives) {
  const directory = path.join(temporaryRoot, framework);
  await mkdir(directory);
  await write(directory, "package.json", JSON.stringify({ name: `adapter-${framework}`, private: true, type: "module" }));
  const dependencies = [archives.core, archives.lucide, archives.hugeicons, archives[framework]];
  if (framework === "preact") dependencies.push(
    `preact@${manifest.devDependencies.preact}`,
    `preact-render-to-string@${manifest.devDependencies["preact-render-to-string"]}`,
  );
  await exec(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...dependencies], {
    cwd: directory, maxBuffer: 16 * 1024 * 1024, timeout: 120_000,
  });
  const lock = JSON.parse(await readFile(path.join(directory, "package-lock.json"), "utf8"));
  assert.ok(!Object.keys(lock.packages).some(name => /node_modules\/(?:react|react-dom|@types\/react|sketchicon)$/.test(name)),
    `${framework} installed React or the React adapter`);
  if (framework === "dom") assert.ok(!Object.keys(lock.packages).some(name => /node_modules\/preact$/.test(name)));
  return directory;
}
async function typecheck(directory, source, preact) {
  await write(directory, "consumer.tsx", source);
  for (const resolution of ["NodeNext", "Bundler"]) {
    await write(directory, "tsconfig.json", JSON.stringify({
      compilerOptions: {
        module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
        moduleResolution: resolution,
        target: "ES2022", strict: true, noEmit: true, skipLibCheck: false,
        jsx: "react-jsx", ...(preact ? { jsxImportSource: "preact" } : {}),
      },
      include: ["consumer.tsx"],
    }));
    await exec(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-p", directory], { cwd: directory });
  }
}
async function bundle(directory, source, file = "bundle.js") {
  await write(directory, "entry.js", source);
  const result = await build({
    root: directory, configFile: false, logLevel: "silent",
    build: { write: false, minify: "esbuild", lib: { entry: path.join(directory, "entry.js"), formats: ["es"] } },
  });
  const results = Array.isArray(result) ? result : [result];
  const chunks = results.flatMap(result => result.output).filter(output => output.type === "chunk");
  const code = chunks.map(chunk => chunk.code).join("\n");
  const modules = chunks.flatMap(chunk => Object.entries(chunk.modules).filter(([, module]) => module.renderedLength > 0).map(([name]) => name));
  assert.ok(!modules.some(name => /node_modules\/(?:react|react-dom)\//.test(name)), "React leaked into an adapter bundle");
  assert.ok(modules.filter(name => /\/icons\/[^/]+\.js$/.test(name)).length <= 2, "Unused icon geometry leaked into bundle");
  const gzipBytes = gzipSync(code).length;
  const budget = path.basename(directory) === "preact" ? 24_000 : 12_000;
  console.log(`${path.basename(directory)}/${file}: ${Buffer.byteLength(code)} bytes, ${gzipBytes} gzip (budget ${budget}).`);
  assert.ok(gzipBytes < budget, `Adapter fixture bundle is ${gzipBytes} bytes gzip; budget ${budget}.`);
  await write(directory, file, code);
  return code;
}

try {
  const archives = {};
  for (const [key, name] of Object.entries({ core: "@sketchicon/core", preact: "@sketchicon/preact", dom: "@sketchicon/dom", lucide: "@sketchicon/lucide", hugeicons: "@sketchicon/hugeicons" })) {
    archives[key] = await pack(name);
  }
  const preact = await consumer("preact", archives);
  const dom = await consumer("dom", archives);
  await typecheck(preact, `
    import { createRef } from "preact";
    import { SketchIcon } from "@sketchicon/preact";
    import Search from "@sketchicon/lucide/icons/search";
    import Home from "@sketchicon/hugeicons/icons/home-01";
    const ref = createRef<SVGSVGElement>();
    const icons = [Search, Home].map(icon => <SketchIcon icon={icon} ref={ref} title="Icon"
      onClick={event => event.currentTarget.setAttribute("data-clicked", "yes")} />);
    // @ts-expect-error: React raw HTML is not part of the Preact icon API
    const invalid = <SketchIcon icon={Search} dangerouslySetInnerHTML={{ __html: "" }} />;
  `, true);
  await typecheck(dom, `
    import { createSketchIcon, updateSketchIcon } from "@sketchicon/dom";
    import { createSketchIcon as browserIcon } from "@sketchicon/dom/browser";
    import Search from "@sketchicon/lucide/icons/search";
    import Home from "@sketchicon/hugeicons/icons/home-01";
    const svg: SVGSVGElement = createSketchIcon(Search, { attributes: { "aria-label": "Search" } });
    updateSketchIcon(svg, Home, { title: "Home", size: "1em" });
    browserIcon(Home);
  `, false);

  const { createSketchIcon, updateSketchIcon } = await import(pathToFileURL(path.join(dom, "node_modules/@sketchicon/dom/dist/index.js")));
  const { default: Search } = await import(pathToFileURL(path.join(dom, "node_modules/@sketchicon/lucide/dist/icons/search.js")));
  const { default: Home } = await import(pathToFileURL(path.join(dom, "node_modules/@sketchicon/hugeicons/dist/icons/home-01.js")));
  const document = new JSDOM("").window.document;
  for (const geometry of [Search, Home]) {
    const svg = createSketchIcon(geometry, { title: "Icon" }, document);
    assert.ok(svg.querySelector("path"));
    assert.equal(updateSketchIcon(svg, geometry, { roughness: 0 }), svg);
    assert.equal(svg.getAttribute("aria-hidden"), "true");
  }
  // The browser build must be self-contained and safe to import in Node too.
  const browserSource = await readFile(path.join(dom, "node_modules/@sketchicon/dom/dist/browser.js"), "utf8");
  assert.ok(!/\b(?:import|require)\s*(?:\(|["'{*])/.test(browserSource), "Browser build contains an unresolved import");
  const browserApi = await import(pathToFileURL(path.join(dom, "node_modules/@sketchicon/dom/dist/browser.js")));
  assert.equal(browserApi.createSketchIcon(Search, {}, document).outerHTML, createSketchIcon(Search, {}, document).outerHTML);

  await write(preact, "app.js", `
    import { h } from "preact";
    import { useState } from "preact/hooks";
    import { SketchIcon } from "@sketchicon/preact";
    import Search from "@sketchicon/lucide/icons/search";
    import Home from "@sketchicon/hugeicons/icons/home-01";
    export function App() {
      const [changed, setChanged] = useState(false);
      return h("div", null,
        h(SketchIcon, { icon: changed ? Home : Search, roughness: changed ? 0 : 1.5,
          title: "Icon", ref: node => { if (typeof window !== "undefined") window.iconRef = node; } }),
        h("button", { onClick: () => setChanged(true) }, "Update"));
    }
  `);
  await write(preact, "ssr.mjs", 'import { h } from "preact"; import { renderToString } from "preact-render-to-string"; import { App } from "./app.js"; console.log(renderToString(h(App)));');
  const { stdout: serverHtml } = await exec(process.execPath, [path.join(preact, "ssr.mjs")], { cwd: preact });
  assert.match(serverHtml, /<svg/);
  await bundle(preact, 'import { h, hydrate } from "preact"; import { App } from "./app.js"; window.beforeHydration = document.querySelector("svg"); hydrate(h(App), document.getElementById("root"));');
  await write(preact, "index.html", `<div id="root">${serverHtml}</div><script type="module" src="/preact/bundle.js"></script>`);

  const domEntry = `
    import { createSketchIcon, updateSketchIcon } from "@sketchicon/dom";
    import Search from "@sketchicon/lucide/icons/search";
    import Home from "@sketchicon/hugeicons/icons/home-01";
    const svg = createSketchIcon(Search, { title: "Search" });
    window.initialIcon = svg;
    window.iconClicks = 0;
    svg.addEventListener("click", () => window.iconClicks++);
    document.body.append(svg);
    const button = document.createElement("button");
    button.textContent = "Update";
    button.onclick = () => updateSketchIcon(svg, Home, { roughness: 0 });
    document.body.append(button);
  `;
  const direct = await bundle(dom, domEntry);
  const barrel = await bundle(dom, domEntry.replace('import Search from "@sketchicon/lucide/icons/search"', 'import { Search } from "@sketchicon/lucide"').replace('import Home from "@sketchicon/hugeicons/icons/home-01"', 'import { Home01Icon as Home } from "@sketchicon/hugeicons"'), "barrel.js");
  assert.ok(Math.abs(direct.length - barrel.length) < 250, "Provider barrels do not tree-shake to the selected geometry");
  await write(dom, "index.html", '<script type="module" src="/dom/bundle.js"></script>');
  const noBuild = path.join(temporaryRoot, "no-build");
  await mkdir(noBuild);
  await write(noBuild, "sketchicon.js", browserSource);
  await write(noBuild, "search.js", await readFile(path.join(dom, "node_modules/@sketchicon/lucide/dist/icons/search.js")));
  await write(noBuild, "index.html", '<script type="module">import { createSketchIcon } from "./sketchicon.js"; import Search from "./search.js"; document.body.append(createSketchIcon(Search, {title:"Search"}));</script>');

  if (browserMode) {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    server = createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, "http://localhost").pathname;
        const target = path.resolve(temporaryRoot, "." + pathname);
        if (!target.startsWith(temporaryRoot + path.sep)) throw new Error("Invalid path");
        const source = await readFile(target);
        response.setHeader("content-type", target.endsWith(".js") ? "text/javascript" : "text/html");
        response.end(source);
      } catch { response.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    for (const fixture of ["preact", "dom", "no-build"]) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(String(error)));
      await page.goto(`http://127.0.0.1:${port}/${fixture}/index.html`);
      await page.waitForSelector("svg path");
      assert.ok(await page.locator("svg").isVisible());
      if (fixture !== "no-build") {
        const first = await page.locator("svg").innerHTML();
        if (fixture === "preact") assert.equal(await page.evaluate(() => window.iconRef === window.beforeHydration), true);
        await page.getByRole("button", { name: "Update" }).click();
        await page.waitForFunction(previous => document.querySelector("svg").innerHTML !== previous, first);
        if (fixture === "dom") {
          assert.equal(await page.evaluate(() => document.querySelector("svg") === window.initialIcon), true);
          await page.locator("svg").click();
          assert.equal(await page.evaluate(() => window.iconClicks), 1);
          assert.equal(await page.locator("svg").getAttribute("aria-hidden"), "true");
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  }
  console.log(`Verified packed Preact and DOM adapters: isolated installs, types, SSR, DOM rendering, browser module, tree shaking${browserMode ? ", and Chromium hydration/updates/no-build HTML" : ""}.`);
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(temporaryRoot, { recursive: true, force: true });
}
