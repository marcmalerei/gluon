import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const packageRoot = resolve(root, 'packages/devtools');
const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(packageRoot, 'browser-inspector.manifest.json'), 'utf8'));

const expected = {
  schemaVersion: 1,
  name: 'gluon-devtools-browser-inspector',
  package: '@gluonjs/devtools',
  format: 'esm-package',
  packageExport: '.',
  inspectorExport: 'mountGluonDevtools',
  protocolVersion: 1,
};
for (const [key, value] of Object.entries(expected)) {
  if (manifest[key] !== value) throw new Error(`devtools browser manifest ${key} must be ${JSON.stringify(value)}`);
}
if (packageJson.name !== manifest.package) throw new Error('devtools browser manifest package does not match package.json');
if (!packageJson.files?.includes('browser-inspector.manifest.json')) throw new Error('devtools browser manifest is not included in package files');
if (Object.keys(packageJson.exports ?? {}).join(',') !== '.') {
  throw new Error('devtools browser artifact must preserve the supported package-contract exports');
}
if (manifest.runtime?.mode !== 'serve-only' || manifest.runtime?.productionExposure !== false) {
  throw new Error('devtools browser manifest must disable production exposure');
}
if (!Array.isArray(manifest.security?.permissions) || manifest.security.permissions.length !== 0
  || manifest.security.remoteInspection !== false
  || manifest.security.sourceNavigation !== 'callback-only-redacted'
  || manifest.security.sourceExcerpts !== false) {
  throw new Error('devtools browser manifest security contract is incomplete');
}

const runtime = await readFile(resolve(packageRoot, 'dist/index.js'), 'utf8');
const declarations = await readFile(resolve(packageRoot, 'dist/index.d.ts'), 'utf8');
for (const name of ['createDevtoolsBridge', 'createDevtoolsArtifactContract', 'mountGluonDevtools', 'gluonDevtoolsPlugin']) {
  if (!new RegExp(`\\b${name}\\b`).test(runtime) || !new RegExp(`\\b${name}\\b`).test(declarations)) {
    throw new Error(`built devtools artifact does not export ${name}`);
  }
}
if (!/\bDevtoolsInspectorOptions\b/.test(declarations) || !/\bDevtoolsArtifactContract\b/.test(declarations)) {
  throw new Error('built devtools declarations omit the browser inspector contracts');
}

const packed = spawnSync('npm', ['pack', '--dry-run', '--json', packageRoot], {
  cwd: root,
  encoding: 'utf8',
});
if (packed.status !== 0) throw new Error(`npm pack --dry-run failed:\n${packed.stderr || packed.stdout}`);
const packResult = JSON.parse(packed.stdout)[0];
const packedPaths = new Set(packResult.files.map((file) => file.path));
for (const path of ['browser-inspector.manifest.json', 'dist/index.js', 'dist/index.d.ts', 'package.json', 'README.md']) {
  if (!packedPaths.has(path)) throw new Error(`packed devtools artifact is missing ${path}`);
}

const packedManifest = JSON.parse(await readFile(resolve(packageRoot, 'browser-inspector.manifest.json'), 'utf8'));
if (packedManifest.packageExport !== '.' || packedManifest.inspectorExport !== 'mountGluonDevtools') {
  throw new Error('packed devtools browser contract must resolve through the supported package root export');
}

console.log(`devtools browser artifact valid: ${packedPaths.size} packed files, protocol ${manifest.protocolVersion}, no permissions or remote inspection`);
