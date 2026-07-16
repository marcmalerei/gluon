import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const packageRoot = resolve(root, 'packages/language-server');
const directory = await mkdtemp(resolve(tmpdir(), 'gluon-project-analyzer-clean-'));

try {
  const packed = JSON.parse((await execFile('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', directory,
  ], { cwd: packageRoot })).stdout)[0];
  const consumer = resolve(directory, 'consumer');
  await mkdir(resolve(consumer, 'src'), { recursive: true });
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ name: 'project-analyzer-clean-consumer', private: true }, null, 2));
  await writeFile(resolve(consumer, 'src/app.ts'), `
    import { html } from '@gluonjs/core';
    export const page = () => html\`<main>Clean install</main>\`;
    export const routes = [{ path: '/clean' }];
  `);
  await execFile('npm', ['install', resolve(directory, packed.filename), '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: consumer, maxBuffer: 10 * 1024 * 1024,
  });
  const { stdout } = await execFile(resolve(consumer, 'node_modules/.bin/gluon-project-analyze'), ['src'], { cwd: consumer });
  const report = JSON.parse(stdout);
  if (report.schemaVersion !== 1 || report.files.length !== 1 || report.routes[0]?.value.path !== '/clean') {
    throw new Error('clean consumer project report failed');
  }
  await execFile(process.execPath, ['--input-type=module', '-e',
    "import { PROJECT_ANALYSIS_SCHEMA, analyzeStaticGluonProject } from '@gluonjs/language-server'; if (PROJECT_ANALYSIS_SCHEMA.properties.schemaVersion.const !== 1 || analyzeStaticGluonProject([]).schemaVersion !== 1) process.exit(1);"],
  { cwd: consumer });
  const manifest = JSON.parse(await readFile(resolve(consumer, 'node_modules/@gluonjs/language-server/package.json'), 'utf8'));
  if (!manifest.bin['gluon-project-analyze']) throw new Error('clean consumer project analyzer bin is missing');
  console.log('project analyzer clean install valid: CLI, schema, public API, and zero-config report');
} finally {
  await rm(directory, { recursive: true, force: true });
}
