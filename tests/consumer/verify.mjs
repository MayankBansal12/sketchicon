import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'sketchicon-e2e-'));
const packages = new Map();
const requestedPackages = new Set();
const env = {
  ...process.env, CI: '1', SKETCHICON_NO_TELEMETRY: '1', NEXT_TELEMETRY_DISABLED: '1',
  npm_config_cache: path.join(temporaryRoot, 'npm-cache'),
};
let browser;
let registry;

async function command(binary, args, cwd, extraEnv = {}) {
  try {
    return await exec(binary, args, {
      cwd, env: { ...env, npm_config_cache: path.join(cwd === root ? temporaryRoot : cwd, '.npm-cache'), ...extraEnv }, timeout: 240_000, maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`${binary} ${args.join(' ')} failed in ${cwd}\n${error.stdout ?? ''}\n${error.stderr ?? ''}`, { cause: error });
  }
}

async function write(directory, file, contents) {
  const target = path.join(directory, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function startRegistry() {
  const archives = path.join(temporaryRoot, 'archives');
  await mkdir(archives);
  for (const workspace of ['core', 'runtime', 'lucide', 'hugeicons']) {
    const manifest = JSON.parse(await readFile(path.join(root, 'packages', workspace, 'package.json'), 'utf8'));
    const { stdout } = await command('npm', ['pack', '--workspace', manifest.name, '--json', '--pack-destination', archives], root);
    const [{ filename }] = JSON.parse(stdout);
    const tarball = await readFile(path.join(archives, filename));
    packages.set(manifest.name, { manifest, tarball });
  }
  registry = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
    const tarballName = pathname.startsWith('tarballs/') ? pathname.slice('tarballs/'.length) : undefined;
    const entry = packages.get(tarballName ?? pathname);
    if (!entry) {
      // Never let a missing local SketchIcon package fall back to the published release.
      if (pathname === 'sketchicon' || pathname.startsWith('@sketchicon/')) {
        response.writeHead(404).end('Unknown local package');
      } else {
        response.writeHead(302, { location: `https://registry.npmjs.org/${request.url.slice(1)}` }).end();
      }
      return;
    }
    requestedPackages.add(entry.manifest.name);
    if (tarballName) {
      response.writeHead(200, { 'content-type': 'application/octet-stream' }).end(entry.tarball);
      return;
    }
    const { manifest, tarball } = entry;
    const origin = `http://127.0.0.1:${registry.address().port}`;
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
      name: manifest.name,
      'dist-tags': { latest: manifest.version },
      versions: {
        [manifest.version]: {
          ...manifest,
          dist: {
            tarball: `${origin}/tarballs/${encodeURIComponent(manifest.name)}`,
            integrity: `sha512-${createHash('sha512').update(tarball).digest('base64')}`,
          },
        },
      },
    }));
  });
  registry.listen(0, '127.0.0.1');
  await once(registry, 'listening');
  return `http://127.0.0.1:${registry.address().port}`;
}

async function createFixture(framework, pack, registryUrl) {
  const directory = path.join(temporaryRoot, `${framework}-${pack}`);
  await mkdir(directory);
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  const version = (name) => lock.packages[`node_modules/${name}`].version;
  const dependencies = {
    react: version('react'), 'react-dom': version('react-dom'),
    ...(framework === 'next' ? { next: '16.3.1' } : { vite: version('vite') }),
  };
  await write(directory, 'package.json', JSON.stringify({
    name: `consumer-${framework}-${pack}`, private: true, type: 'module', dependencies,
    devDependencies: { typescript: version('typescript'), '@types/react': version('@types/react'), '@types/react-dom': version('@types/react-dom'), '@types/node': version('@types/node') },
  }, null, 2));
  await write(directory, '.npmrc', `registry=${registryUrl}\naudit=false\nfund=false\n`);
  await command('npm', ['install', '--ignore-scripts'], directory);
  const importPath = pack === 'lucide' ? '@sketchicon/lucide/icons/search' : '@sketchicon/hugeicons/icons/home-01';
  const client = `"use client";
import { useState } from 'react';
import { SketchIcon } from 'sketchicon';
import Icon from '${importPath}';
export default function ClientIcon() {
  const [size, setSize] = useState(24);
  return <><button onClick={() => setSize(40)}>Resize</button><SketchIcon icon={Icon} size={size} aria-label="Client icon" /></>;
}
`;
  await write(directory, 'tsconfig.json', JSON.stringify({
    compilerOptions: { target: 'ES2022', lib: ['dom', 'esnext'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true },
    include: ['**/*.tsx'], exclude: ['node_modules'],
  }));
  if (framework === 'next') {
    await write(directory, 'app/client.tsx', client);
    await write(directory, 'app/layout.tsx', `export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }`);
    await write(directory, 'app/page.tsx', `import { SketchIcon } from 'sketchicon/server';\nimport Icon from '${importPath}';\nimport ClientIcon from './client';\nexport default function Page() { return <main><SketchIcon icon={Icon} aria-label="Server icon" /><ClientIcon /></main>; }`);
  } else {
    await write(directory, 'src/client.tsx', client);
    await write(directory, 'src/main.tsx', `import { createRoot } from 'react-dom/client';\nimport ClientIcon from './client';\ncreateRoot(document.getElementById('root')!).render(<ClientIcon />);`);
    await write(directory, 'index.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
  }
  return directory;
}

async function launchApp(directory, framework) {
  // Reserve an ephemeral port; the child binds it immediately after release.
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const executable = framework === 'next' ? 'next' : 'vite';
  const args = framework === 'next' ? ['start', '--hostname', '127.0.0.1', '--port', String(port)] : ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  const child = spawn(path.join(directory, 'node_modules/.bin', executable), args, { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let spawnError;
  child.on('error', (error) => { spawnError = error; });
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null || spawnError) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    try { await exited; } finally { clearTimeout(timer); }
  };
  const url = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (spawnError || child.exitCode !== null) throw new Error(`Server failed: ${spawnError ?? output}`);
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        if (response.ok) return { url, stop };
      } catch { /* Wait for the process to bind and compile. */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Server did not become ready:\n${output}`);
  } catch (error) { await stop(); throw error; }
}

async function verifyCliOptions(directory) {
  const cli = path.join(directory, 'node_modules/.bin/sketchicon');
  const snapshot = async () => Promise.all(['package.json', 'package-lock.json'].map((file) => readFile(path.join(directory, file), 'utf8')));
  const before = await snapshot();
  const { stdout: help } = await command(cli, ['--help'], directory);
  assert.match(help, /Usage:/);
  for (const args of [['--all'], ['--yes']]) {
    const { stdout } = await command(cli, [...args, '--dry-run'], directory);
    assert.match(stdout, /Dry run complete/);
    if (args[0] === '--all') assert.match(stdout, /Icon packs: lucide, hugeicons/);
  }
  await assert.rejects(command(cli, ['--packs', 'unknown'], directory), (error) => {
    assert.equal(error.cause.code, 1);
    assert.match(error.message, /Unknown icon pack/);
    return true;
  });
  await assert.rejects(command(cli, [], directory), (error) => {
    assert.equal(error.cause.code, 1);
    assert.match(error.message, /Non-interactive use requires/);
    return true;
  });
  assert.deepEqual(await snapshot(), before, 'Help, dry run, or invalid flags mutated the project');
}

async function verifyScenario(framework, pack, registryUrl) {
  console.log(`Testing ${framework} / ${pack}: fresh npx install → typecheck → build → browser`);
  const directory = await createFixture(framework, pack, registryUrl);
  requestedPackages.clear();
  const { stdout } = await command('npx', ['--yes', 'sketchicon', `--${pack}`, '--package-manager', 'npm'], directory);
  assert.match(stdout, /SketchIcon is ready/);
  assert.ok(stdout.includes(`Icon packs: ${pack}`));
  for (const name of ['sketchicon', '@sketchicon/core', `@sketchicon/${pack}`]) {
    const installed = JSON.parse(await readFile(path.join(directory, 'node_modules', name, 'package.json'), 'utf8'));
    assert.equal(installed.version, packages.get(name).manifest.version);
    assert.ok(requestedPackages.has(name), `${name} was not served from the local registry`);
  }
  const other = pack === 'lucide' ? 'hugeicons' : 'lucide';
  await assert.rejects(readFile(path.join(directory, 'node_modules/@sketchicon', other, 'package.json')), { code: 'ENOENT' });
  const before = await readFile(path.join(directory, 'package.json'), 'utf8');
  await command('npx', ['--yes', 'sketchicon', `--${pack}`, '--package-manager', 'npm'], directory);
  assert.equal(await readFile(path.join(directory, 'package.json'), 'utf8'), before, 'Reinstall changed the manifest');
  if (framework === 'vite' && pack === 'lucide') await verifyCliOptions(directory);
  await command(path.join(directory, 'node_modules/.bin/tsc'), ['--noEmit'], directory);
  await command(path.join(directory, 'node_modules/.bin', framework === 'next' ? 'next' : 'vite'), ['build'], directory);
  const app = await launchApp(directory, framework);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    const response = await page.goto(app.url);
    assert.equal(response.status(), 200);
    if (framework === 'next') {
      assert.match(await response.text(), /aria-label="Server icon"/, 'Server icon missing from SSR HTML');
    }
    await page.getByRole('button', { name: 'Resize' }).click();
    await page.waitForFunction(() => document.querySelector('svg[aria-label="Client icon"]')?.getAttribute('width') === '40');
    for (const label of framework === 'next' ? ['Client icon', 'Server icon'] : ['Client icon']) {
      const svg = page.locator(`svg[aria-label="${label}"]`);
      assert.ok(await svg.isVisible(), `${label} is not visible`);
      assert.ok(await svg.locator('path[d]').count(), `${label} has no paths`);
      assert.ok(await svg.locator('path[d]').evaluateAll((paths) => paths.every((p) => p.getAttribute('d').length > 0)), `${label} has empty geometry`);
    }
    assert.deepEqual(errors, [], 'Browser runtime or hydration errors');
  } finally {
    await page.close();
    await app.stop();
  }
  console.log(`PASS ${framework} / ${pack}`);
}

try {
  const registryUrl = await startRegistry();
  browser = await chromium.launch();
  for (const framework of ['vite', 'next']) {
    for (const pack of ['lucide', 'hugeicons']) await verifyScenario(framework, pack, registryUrl);
  }
} finally {
  await browser?.close();
  if (registry) await new Promise((resolve) => registry.close(resolve));
  await rm(temporaryRoot, { recursive: true, force: true });
}
