import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const directory = await mkdtemp(resolve(tmpdir(), 'gluon-eleventy-clean-'));

try {
  const packageDirectories = [
    'packages/reactivity',
    '.',
    'packages/router',
    'packages/store',
    'packages/ssr',
  ];
  const archives = [];
  for (const packageDirectory of packageDirectories) {
    const packed = JSON.parse((await execFile('npm', [
      'pack', '--json', '--ignore-scripts', '--pack-destination', directory,
    ], { cwd: resolve(root, packageDirectory) })).stdout)[0];
    archives.push(resolve(directory, packed.filename));
  }
  const consumer = resolve(directory, 'consumer');
  await mkdir(resolve(consumer, 'routes'), { recursive: true });
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ name: 'gluon-eleventy-clean-consumer', private: true, type: 'module' }, null, 2));
  await writeFile(resolve(consumer, 'routes/index.gluon'), '/clean\n');
  await writeFile(resolve(consumer, 'eleventy.config.js'), `
    import { gluonEleventyPlugin } from '@gluonjs/ssr/eleventy';
    export default function (config) {
      config.addPlugin(gluonEleventyPlugin, {
        assets: { entry: '/assets/app.js' },
        createRequest: ({ url }) => ({ render: () => ({
          html: '<main>' + url + '</main>', state: '{}',
          stateScript: '<script type="application/json" data-gluon-state>{}</script>',
          head: '<script type="module" src="/assets/app.js"></script>',
          styles: { version: 1, entries: [] }, router: { location: url }, store: { version: 1, stores: {} },
        }) }),
      });
    }
  `);
  await execFile('npm', ['install', ...archives, '@11ty/eleventy@3.1.6', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: consumer, maxBuffer: 20 * 1024 * 1024,
  });
  await execFile(resolve(consumer, 'node_modules/.bin/eleventy'), [
    '--config=eleventy.config.js', '--input=routes', '--output=_site',
  ], { cwd: consumer });
  const output = await readFile(resolve(consumer, '_site/index.html'), 'utf8');
  if (!output.includes('<main>/clean</main>') || !output.includes('data-gluon-state')) {
    throw new Error('clean Eleventy consumer output is incomplete');
  }
  console.log('Eleventy adapter clean install valid: packed local release train, SSR subpath, real Eleventy build, and hydratable output');
} finally {
  await rm(directory, { recursive: true, force: true });
}
