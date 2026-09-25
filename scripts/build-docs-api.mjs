import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const versions = JSON.parse(await readFile(resolve(root, 'docs-site/versions.json'), 'utf8'));
const output = resolve(root, 'docs-site/content', versions.latest, 'api', 'generated');
const docsRoot = resolve(root, 'docs-site/content');
await mkdir(output, { recursive: true });

const typedoc = spawnSync(process.execPath, [
  resolve(root, 'node_modules/typedoc/bin/typedoc'),
  '--options', 'typedoc.json',
  '--out', relative(root, output),
  '--docsRoot', relative(root, docsRoot),
  '--treatWarningsAsErrors',
], { cwd: root, stdio: 'inherit' });
if (typedoc.status !== 0) process.exit(typedoc.status ?? 1);

const examples = spawnSync(process.execPath, [resolve(root, 'scripts/generate-api-examples.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
if (examples.status !== 0) process.exit(examples.status ?? 1);

const contentEntries = await readdir(docsRoot, { withFileTypes: true });
for (const entry of contentEntries) {
  if (!entry.isDirectory() || !/^\d+\.\d+\.\d+$/.test(entry.name) || entry.name === versions.latest) continue;
  await cp(output, resolve(docsRoot, entry.name, 'api', 'generated'), { recursive: true, force: true });
}
