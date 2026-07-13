import { execFileSync, spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, expect, test } from 'vitest';
import {
  analyzeVueMigration,
  formatVueMigrationReport,
  VueMigrationAnalyzerError,
} from '../packages/vue-migration-analyzer/src/index.js';
import { vueMigrationReportSchema } from '../packages/vue-migration-analyzer/src/schema.js';

const root = resolve(import.meta.dirname, '..');
const packageRoot = resolve(root, 'packages/vue-migration-analyzer');
const cli = resolve(packageRoot, 'dist/src/cli.js');
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test('analyzes the retained supported corpus deterministically against the public schema', async () => {
  const fixture = resolve(packageRoot, 'fixtures/supported');
  const before = await tree(fixture);
  const first = await analyzeVueMigration({ root: fixture });
  const second = await analyzeVueMigration({ root: fixture });
  const json = formatVueMigrationReport(first, 'json');
  expect(json).toBe(formatVueMigrationReport(second, 'json'));
  expect(await tree(fixture)).toEqual(before);
  expect(first.summary.supportState).toBe('supported');
  expect(first.components).toHaveLength(2);
  expect(first.inventory.map((item) => item.kind)).toEqual(expect.arrayContaining([
    'prop', 'emit', 'model', 'slot-use', 'ref', 'reactive-primitive', 'lifecycle',
    'router-import', 'store-import', 'async-component', 'suspense', 'style-block',
    'ssr-call', 'hydration-call', 'test-file', 'build-config', 'build-plugin', 'vue-dependency',
  ]));
  expect(first.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
    'GVA1301', 'GVA1302', 'GVA1303', 'GVA1401', 'GVA1402', 'GVA1501', 'GVA1601',
  ]));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(vueMigrationReportSchema);
  expect(validate(first), JSON.stringify(validate.errors)).toBe(true);
});

test('emits explicit unsupported and malformed diagnostics without guessed success', async () => {
  const unsupported = await analyzeVueMigration({ root: resolve(packageRoot, 'fixtures/unsupported') });
  expect(unsupported.summary.supportState).not.toBe('supported');
  expect(unsupported.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
    'GVA1001', 'GVA1003', 'GVA1101', 'GVA1102', 'GVA1201', 'GVA1202', 'GVA1203', 'GVA1403',
  ]));
  const malformed = await analyzeVueMigration({ root: resolve(packageRoot, 'fixtures/malformed') });
  expect(malformed.findings.some((finding) => finding.code === 'GVA1103')).toBe(true);
  expect(malformed.summary.severities.error).toBeGreaterThan(0);
});

test('never executes adversarial source, package scripts, imports, or Vite configuration', async () => {
  const fixture = resolve(packageRoot, 'fixtures/adversarial');
  const sentinel = resolve(fixture, 'sentinel-created');
  await rm(sentinel, { force: true });
  const report = await analyzeVueMigration({ root: fixture });
  await expect(access(sentinel)).rejects.toThrow();
  expect(report.inventory.some((item) => item.kind === 'build-config')).toBe(true);
  expect(report.summary.supportState).toBe('supported');
});

test('finds the production Vue host and links it to the tested cutover stages', async () => {
  const report = await analyzeVueMigration({ root });
  const host = report.components.find((component) => component.id === 'component:docs-site/examples/VueProductHost.vue');
  expect(host).toBeDefined();
  expect(host?.migrationStages).toEqual(expect.arrayContaining(['leaf-boundary', 'state-form']));
  expect(report.inventory.some((item) => item.fileId === host?.fileId && item.kind === 'model')).toBe(false);
  expect(report.findings.every((finding) => finding.guideUrl.includes('/migration/vue-to-gluon-cutover/'))).toBe(true);
});

test('enforces invalid UTF-8 and fixed per-file resource budgets', async () => {
  const fixture = await project();
  await writeFile(resolve(fixture, 'Invalid.vue'), Buffer.from([0xff, 0xfe]));
  await writeFile(resolve(fixture, 'Large.ts'), 'x'.repeat(2_097_153));
  const report = await analyzeVueMigration({ root: fixture });
  expect(report.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(['GVA1103', 'GVA9002']));
  expect(report.files.find((file) => file.path === 'Large.ts')?.parseStatus).toBe('limited');
  expect(spawnSync(process.execPath, [cli, fixture]).status).toBe(3);
});

test('records but never follows symbolic links outside the real analysis root', async () => {
  const fixture = await project();
  const outside = await mkdtemp(resolve(tmpdir(), 'gluon-vue-analyzer-outside-'));
  temporary.push(outside);
  await writeFile(resolve(outside, 'secret.ts'), 'export const secret = "not reportable";');
  await symlink(resolve(outside, 'secret.ts'), resolve(fixture, 'escape.ts'));
  const report = await analyzeVueMigration({ root: fixture });
  expect(report.findings.some((finding) => finding.code === 'GVA9003')).toBe(true);
  expect(report.files.find((file) => file.path === 'escape.ts')).toEqual(expect.objectContaining({ kind: 'symlink', parseStatus: 'skipped', bytes: 0 }));
  expect(formatVueMigrationReport(report, 'json')).not.toContain('not reportable');
});

test('implements the exact CLI formats and exit codes', () => {
  const supported = resolve(packageRoot, 'fixtures/supported');
  const unsupported = resolve(packageRoot, 'fixtures/unsupported');
  const human = execFileSync(process.execPath, [cli, supported], { encoding: 'utf8' });
  expect(human).toContain('Support: supported');
  expect(human).toContain('GVA1401 warning structural');
  const json = execFileSync(process.execPath, [cli, supported, '--format', 'json'], { encoding: 'utf8' });
  expect(JSON.parse(json).schemaVersion).toBe('1.0.0');
  expect(spawnSync(process.execPath, [cli, unsupported]).status).toBe(1);
  expect(spawnSync(process.execPath, [cli, resolve(root, 'missing')]).status).toBe(2);
  expect(spawnSync(process.execPath, [cli, '--format', 'yaml']).status).toBe(2);
  expect(execFileSync(process.execPath, [cli, '--version'], { encoding: 'utf8' })).toBe('1.0.0\n');
});

test('exports one deeply frozen schema and rejects unreadable roots', async () => {
  expect(Object.isFrozen(vueMigrationReportSchema)).toBe(true);
  expect(Object.isFrozen(vueMigrationReportSchema.properties)).toBe(true);
  await expect(analyzeVueMigration({ root: resolve(root, 'missing') }))
    .rejects.toEqual(expect.objectContaining<VueMigrationAnalyzerError>({ exitCode: 2 }));
});

async function project(): Promise<string> {
  const path = await mkdtemp(resolve(tmpdir(), 'gluon-vue-analyzer-'));
  temporary.push(path);
  await mkdir(resolve(path, 'src'));
  await writeFile(resolve(path, 'package.json'), '{"name":"fixture","dependencies":{"vue":"3.5.39"}}');
  return path;
}

async function tree(path: string): Promise<string[]> {
  const entries: string[] = [];
  const visit = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = resolve(directory, entry.name);
      entries.push(target.slice(path.length + 1));
      if (entry.isDirectory()) await visit(target);
    }
  };
  await visit(path);
  return entries.sort();
}
