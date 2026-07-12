import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(join(tmpdir(), 'gluon-language-cli-'));
const source = `import { defineGluonElement, html } from '@gluonjs/core';
defineGluonElement({
  tagName: 'known-card',
  slots: { default: { required: true }, help: { fallback: true } },
  setup: () => ({ render: () => html\`<slot></slot><slot name="help"></slot>\` }),
});
html\`<known-card><span slot="shipping">Broken</span></known-card><unknown-card aria-labl="Broken"></unknown-card><img>child</img>\`;
`;

try {
  const fixture = join(temporary, 'fixture.ts');
  await writeFile(fixture, source);
  const { analyzeGluonProject } = await import(pathToFileURL(resolve(root, 'packages/language-server/dist/index.js')).href);
  const expected = analyzeGluonProject([{ uri: fixture, text: source }])[0].diagnostics.map((entry) => entry.code).sort();
  let stderr = '';
  let status = 0;
  try {
    execFileSync(process.execPath, [resolve(root, 'packages/language-server/dist/check-cli.js'), fixture], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    status = error.status;
    stderr = error.stderr.toString();
  }
  const actual = [...stderr.matchAll(/\b(GLUON_[A-Z_]+)\b/g)].map((match) => match[1]).sort();
  if (status !== 1) throw new Error(`Expected diagnostic exit 1, received ${status}.`);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`CLI/editor diagnostic mismatch: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}.`);
  }
  process.stdout.write(`language CLI agrees with editor analyzer: ${actual.length} diagnostics\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
