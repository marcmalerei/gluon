import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const packageRoot = resolve(root, 'packages/vue-migration-analyzer');
const directory = await mkdtemp(resolve(tmpdir(), 'gluon-vue-analyzer-clean-'));

try {
  const packed = JSON.parse((await execFile('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', directory], { cwd: packageRoot })).stdout)[0];
  const archive = resolve(directory, packed.filename);
  const consumer = resolve(directory, 'consumer');
  await mkdir(resolve(consumer, 'src'), { recursive: true });
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ name: 'vue-analyzer-clean-consumer', private: true, dependencies: { vue: '3.5.39' } }, null, 2));
  await writeFile(resolve(consumer, 'src/App.vue'), '<script setup lang="ts">\ndefineProps<{ title: string }>();\n</script>\n<template><main>{{ title }}</main></template>\n');
  await execFile('npm', ['install', archive, '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: consumer, maxBuffer: 10 * 1024 * 1024 });
  const cli = resolve(consumer, 'node_modules/.bin/gluon-vue-analyze');
  const { stdout } = await execFile(cli, ['.', '--format', 'json'], { cwd: consumer });
  const report = JSON.parse(stdout);
  if (report.schemaVersion !== '1.0.0' || report.summary.supportState !== 'supported') throw new Error('clean consumer report failed');
  const imported = await execFile(process.execPath, ['--input-type=module', '-e', "import { VUE_MIGRATION_REPORT_SCHEMA_VERSION } from '@gluonjs/vue-migration-analyzer'; import { vueMigrationReportSchema } from '@gluonjs/vue-migration-analyzer/schema'; if (VUE_MIGRATION_REPORT_SCHEMA_VERSION !== '1.0.0' || !Object.isFrozen(vueMigrationReportSchema)) process.exit(1);"], { cwd: consumer });
  void imported;
  const manifest = JSON.parse(await readFile(resolve(consumer, 'node_modules/@gluonjs/vue-migration-analyzer/package.json'), 'utf8'));
  if (Object.keys(manifest.exports).length !== 2 || !manifest.bin['gluon-vue-analyze']) throw new Error('clean consumer public entries failed');
  console.log('Vue analyzer clean install valid: CLI, JSON schema, root export, and schema export');
} finally {
  await rm(directory, { recursive: true, force: true });
}
