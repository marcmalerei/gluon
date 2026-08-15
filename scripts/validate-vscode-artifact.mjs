import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import process from 'node:process';
import yauzl from '../editors/vscode/node_modules/yauzl/index.js';
import { resolveVscodeReleaseOptions } from './vscode-release-options.mjs';

const root = resolve(import.meta.dirname, '..');
const rootManifest = await readJson(resolve(root, 'package.json'));
const sourceServerManifest = await readJson(resolve(root, 'packages/language-server/package.json'));
const { version, tag, output } = resolveVscodeReleaseOptions({
  argv: process.argv.slice(2),
  env: process.env,
  root,
  rootVersion: rootManifest.version,
  defaultOutput: '.tmp/release/vscode',
});
const filename = `gluon-vscode-${version}.vsix`;
const vsix = resolve(output, filename);
const manifest = await readJson(resolve(output, 'vscode-release-manifest.json'));
const expectedManifestKeys = ['extension', 'languageServer', 'publisher', 'schemaVersion', 'sha256', 'tag', 'version', 'vsix'];
if (JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(expectedManifestKeys)) {
  throw new Error('VSIX release manifest has missing or ambiguous fields.');
}
if (manifest.schemaVersion !== 1 || manifest.version !== version || manifest.tag !== tag
  || manifest.vsix !== filename || manifest.extension !== 'gluon-vscode'
  || manifest.publisher !== 'marcmalerei' || manifest.languageServer !== '@gluonjs/language-server') {
  throw new Error('VSIX release manifest is not aligned with the requested package train and tag.');
}

const digest = createHash('sha256').update(await readFile(vsix)).digest('hex');
if (manifest.sha256 !== digest) throw new Error('VSIX release manifest SHA-256 does not match the VSIX bytes.');
const checksumText = await readFile(resolve(output, 'VSIX-SHA256SUMS'), 'utf8');
const checksumMatch = /^([a-f0-9]{64})  ([^\r\n]+)\n$/.exec(checksumText);
if (!checksumMatch || checksumMatch[1] !== digest || checksumMatch[2] !== filename) {
  throw new Error('VSIX-SHA256SUMS must contain exactly one canonical filename and matching SHA-256 record.');
}

const extractionRoot = await mkdtemp(join(tmpdir(), 'gluon-vsix-'));
try {
  await extractVsix(vsix, extractionRoot);
  const extensionRoot = resolve(extractionRoot, 'extension');
  const extensionManifest = await readJson(resolve(extensionRoot, 'package.json'));
  const bundledServerManifest = await readJson(resolve(extensionRoot, 'server/package.json'));
  const bundledCompilerManifest = await readJson(resolve(extensionRoot, 'server/node_modules/@gluonjs/compiler/package.json'));
  const bundledTypescriptManifest = await readJson(resolve(extensionRoot, 'server/node_modules/typescript/package.json'));
  const extensionSource = await readFile(resolve(extensionRoot, extensionManifest.main), 'utf8');

  if (extensionManifest.version !== version || extensionManifest.name !== manifest.extension
    || extensionManifest.publisher !== manifest.publisher || extensionManifest.main !== './extension.cjs') {
    throw new Error('Extracted VSIX extension metadata is not aligned with the release manifest.');
  }
  if (bundledServerManifest.name !== manifest.languageServer || bundledServerManifest.version !== version
    || bundledServerManifest.dependencies?.['@gluonjs/compiler'] !== version
    || bundledServerManifest.dependencies?.typescript !== sourceServerManifest.dependencies?.typescript) {
    throw new Error('Bundled language-server package metadata is not lockstep with the release train.');
  }
  if (bundledCompilerManifest.name !== '@gluonjs/compiler' || bundledCompilerManifest.version !== version) {
    throw new Error('Bundled compiler runtime is not lockstep with the release train.');
  }
  if (!satisfiesCaret(bundledTypescriptManifest.version, bundledServerManifest.dependencies.typescript)) {
    throw new Error('Bundled TypeScript runtime does not satisfy the language-server dependency contract.');
  }
  await validateRuntimeClosure(resolve(extensionRoot, 'server'), bundledServerManifest);
  if (!extensionSource.includes("module: bundledServer")
    || !extensionSource.includes("'server', 'dist', 'server-cli.js'")
    || extensionSource.includes("|| 'gluon-language-server'")) {
    throw new Error('Extracted extension entrypoint does not use the bundled server as its sole default.');
  }

  const serverCli = resolve(extensionRoot, 'server/dist/server-cli.js');
  await activateBundledExtension(extensionRoot, serverCli, extractionRoot);
  const response = await initializeBundledServer(serverCli, extensionRoot);
  if (response.jsonrpc !== '2.0' || response.id !== 1 || response.error
    || response.result?.serverInfo?.name !== '@gluonjs/language-server'
    || response.result?.serverInfo?.version !== version
    || typeof response.result?.capabilities !== 'object') {
    throw new Error('Bundled VSIX language server returned an invalid LSP initialize response.');
  }
} finally {
  await rm(extractionRoot, { recursive: true, force: true });
}

console.log(`VSIX artifact valid for ${tag}: hashes, package train, bundled entrypoint, and LSP initialize smoke passed.`);

async function extractVsix(path, destinationRoot) {
  const zip = await new Promise((resolveOpen, rejectOpen) => {
    yauzl.open(path, { lazyEntries: true, decodeStrings: true, validateEntrySizes: true }, (error, value) => error ? rejectOpen(error) : resolveOpen(value));
  });
  const seen = new Set();
  const seenFolded = new Set();
  await new Promise((resolveExtraction, rejectExtraction) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      zip.close();
      rejectExtraction(error);
    };
    zip.on('error', fail);
    zip.on('end', () => {
      if (settled) return;
      settled = true;
      resolveExtraction();
    });
    zip.on('entry', (entry) => {
      void extractEntry(zip, entry, destinationRoot, seen, seenFolded).then(() => zip.readEntry(), fail);
    });
    zip.readEntry();
  });
}

async function extractEntry(zip, entry, destinationRoot, seen, seenFolded) {
  const name = entry.fileName;
  const parts = name.replace(/\/$/, '').split('/');
  if (!name || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name)
    || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe VSIX entry path: ${JSON.stringify(name)}.`);
  }
  const folded = name.toLowerCase();
  if (seen.has(name) || seenFolded.has(folded)) throw new Error(`Duplicate VSIX entry path: ${name}.`);
  seen.add(name); seenFolded.add(folded);
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  if ((mode & 0o170000) === 0o120000) throw new Error(`VSIX symlink entries are forbidden: ${name}.`);
  const destination = resolve(destinationRoot, ...parts);
  if (destination !== destinationRoot && !destination.startsWith(`${destinationRoot}${sep}`)) throw new Error(`VSIX entry escapes extraction root: ${name}.`);
  if (name.endsWith('/')) {
    await mkdir(destination, { recursive: true });
    return;
  }
  await mkdir(dirname(destination), { recursive: true });
  const input = await new Promise((resolveStream, rejectStream) => zip.openReadStream(entry, (error, stream) => error ? rejectStream(error) : resolveStream(stream)));
  await pipeline(input, createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
}

async function initializeBundledServer(serverCli, cwd) {
  const request = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { rootUri: null, capabilities: {} } });
  const frame = `Content-Length: ${Buffer.byteLength(request)}\r\n\r\n${request}`;
  const output = await new Promise((resolveOutput, rejectOutput) => {
    const child = spawn(process.execPath, [serverCli], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = []; const stderr = [];
    const timer = setTimeout(() => { child.kill(); rejectOutput(new Error('Bundled language server initialize timed out.')); }, 5_000);
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => { clearTimeout(timer); rejectOutput(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) rejectOutput(new Error(`Bundled language server exited ${code}: ${Buffer.concat(stderr).toString('utf8')}`));
      else resolveOutput(Buffer.concat(stdout));
    });
    child.stdin.end(frame);
  });
  const headerEnd = output.indexOf('\r\n\r\n');
  const length = Number(/^Content-Length:\s*(\d+)$/im.exec(output.subarray(0, headerEnd).toString('ascii'))?.[1]);
  if (headerEnd < 0 || !Number.isSafeInteger(length) || output.length !== headerEnd + 4 + length) {
    throw new Error('Bundled language server returned malformed LSP framing.');
  }
  return JSON.parse(output.subarray(headerEnd + 4).toString('utf8'));
}

async function activateBundledExtension(extensionRoot, serverCli, extractionRoot) {
  const harness = resolve(extractionRoot, 'activate-extension.cjs');
  await writeFile(harness, `
const Module = require('node:module');
const { realpathSync } = require('node:fs');
const originalLoad = Module._load;
let captured;
Module._load = function (request, parent, isMain) {
  if (request === 'vscode') return { workspace: { getConfiguration: () => ({ get: (_name, fallback) => fallback }) } };
  if (request === 'vscode-languageclient/node') return {
    TransportKind: { stdio: 1 },
    LanguageClient: class {
      constructor(_id, _name, serverOptions) { captured = serverOptions; }
      async start() {}
      async stop() {}
    },
  };
  return originalLoad.call(this, request, parent, isMain);
};
(async () => {
  const extension = require(process.argv[2]);
  const context = { subscriptions: [] };
  await extension.activate(context);
  if (!captured || realpathSync(captured.module) !== realpathSync(process.argv[3]) || captured.command !== undefined
    || JSON.stringify(captured.args) !== JSON.stringify(['--stdio']) || context.subscriptions.length !== 1) {
    throw new Error('Extension did not activate with the bundled server module: ' + JSON.stringify({ captured, expectedModule: process.argv[3], subscriptions: context.subscriptions.length }));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
`, 'utf8');
  await new Promise((resolveActivation, rejectActivation) => {
    const child = spawn(process.execPath, [harness, resolve(extensionRoot, 'extension.cjs'), serverCli], { cwd: extensionRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    const stderr = [];
    const timer = setTimeout(() => { child.kill(); rejectActivation(new Error('Extracted extension activation timed out.')); }, 5_000);
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => { clearTimeout(timer); rejectActivation(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) rejectActivation(new Error(`Extracted extension activation exited ${code}: ${Buffer.concat(stderr).toString('utf8')}`));
      else resolveActivation();
    });
  });
}

function satisfiesCaret(actual, declared) {
  const match = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(declared ?? '');
  const actualMatch = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(actual ?? '');
  if (!match || !actualMatch) return false;
  const minimum = match.slice(1).map(Number); const candidate = actualMatch.slice(1).map(Number);
  if (candidate[0] !== minimum[0]) return false;
  return candidate[1] > minimum[1] || (candidate[1] === minimum[1] && candidate[2] >= minimum[2]);
}

async function validateRuntimeClosure(serverRoot, serverManifest) {
  const nodeModules = resolve(serverRoot, 'node_modules');
  const queue = [serverManifest];
  const visited = new Set();
  while (queue.length > 0) {
    const owner = queue.shift();
    for (const [name, range] of Object.entries(owner.dependencies ?? {})) {
      const dependency = await readJson(resolve(nodeModules, ...name.split('/'), 'package.json'));
      if (dependency.name !== name || !satisfiesRange(dependency.version, range)) {
        throw new Error(`Bundled runtime dependency ${name}@${dependency.version} does not satisfy ${range}.`);
      }
      const key = `${name}@${dependency.version}`;
      if (!visited.has(key)) { visited.add(key); queue.push(dependency); }
    }
  }
}

function satisfiesRange(actual, declared) {
  if (actual === declared || declared === '*') return true;
  const match = /^(\^|~)(\d+)\.(\d+)\.(\d+)$/.exec(declared ?? '');
  const actualMatch = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(actual ?? '');
  if (!match || !actualMatch) return false;
  const minimum = match.slice(2).map(Number); const candidate = actualMatch.slice(1).map(Number);
  if (candidate[0] !== minimum[0] || compareVersion(candidate, minimum) < 0) return false;
  if (match[1] === '~' || (match[1] === '^' && minimum[0] === 0 && minimum[1] > 0)) return candidate[1] === minimum[1];
  if (match[1] === '^' && minimum[0] === 0 && minimum[1] === 0) return candidate[1] === 0 && candidate[2] === minimum[2];
  return true;
}

function compareVersion(left, right) {
  for (let index = 0; index < 3; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
  return 0;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
