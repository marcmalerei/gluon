import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const contract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));

const required = new Map([
  ['root README', ['Start here', 'Build a complete application', 'Package map', 'Platform principles', 'Release and stability', 'Development', 'Contributing', 'License']],
  ['docs-site README', ['Read and review locally', 'Information architecture', 'Package documentation contract', 'Examples and verification', 'Editing rules']],
  ['documentation ADR index', ['Process']],
  ['documentation RFC index', ['Process']],
  ['diagnostic index', ['Vue migration analyzer diagnostics']],
  ['example README', ['Purpose', 'Run', 'Verify']],
  ['benchmark README', ['Purpose', 'Run', 'Interpret results']],
]);

const failures = [];
const counts = { packages: 0, examples: 0, benchmarks: 0, indexes: 0 };

const rootReadme = await read('README.md');
checkSections('root README', 'README.md', rootReadme, required.get('root README'));

const docsReadme = await read('docs-site/README.md');
checkSections('docs-site README', 'docs-site/README.md', docsReadme, required.get('docs-site README'));

for (const [label, path] of [
  ['documentation ADR index', 'docs/adrs/README.md'],
  ['documentation RFC index', 'docs/rfcs/README.md'],
  ['diagnostic index', 'docs/diagnostics/README.md'],
]) {
  checkSections(label, path, await read(path), required.get(label));
  counts.indexes += 1;
}

for (const entry of contract.packages.filter((item) => item.state === 'current')) {
  const path = entry.directory === '.' ? 'README.md' : `${entry.directory}/README.md`;
  const text = await read(path);
  const title = entry.directory === '.' ? 'Gluon' : entry.name;
  checkSections(`package ${entry.name}`, path, text, [
    title,
    `${entry.name} at a glance`,
    'Install',
    'Quick start',
    'Choose this package when',
    'Related documentation',
  ]);
  for (const marker of [
    '<!-- gluon-package-overview:start -->',
    '<!-- gluon-package-overview:end -->',
  ]) {
    if ((text.split(marker).length - 1) !== 1) failures.push(`${path}: expected exactly one ${marker}`);
  }
  counts.packages += 1;
}

for (const directory of ['component-library', 'playground', 'shop', 'signals', 'virtualizer']) {
  const path = `examples/${directory}/README.md`;
  checkSections(`example ${directory}`, path, await read(path), required.get('example README'));
  counts.examples += 1;
}

for (const directory of ['bundle', 'spread-bindings', 'dx/runs']) {
  const path = `benchmarks/${directory}/README.md`;
  checkSections(`benchmark ${directory}`, path, await read(path), required.get('benchmark README'));
  counts.benchmarks += 1;
}

if (failures.length > 0) {
  throw new Error(`README structure invalid:\n- ${failures.join('\n- ')}`);
}

console.log(`README structure valid: ${counts.packages} packages, ${counts.examples} examples, ${counts.benchmarks} benchmarks, ${counts.indexes} indexes`);

function checkSections(label, path, text, sections) {
  const headings = [...text.matchAll(/^#{1,3} (.+)$/gm)].map((match) => match[1].trim());
  let cursor = -1;
  for (const section of sections) {
    const next = headings.indexOf(section, cursor + 1);
    if (next === -1) {
      failures.push(`${path}: ${label} is missing section "${section}"`);
      continue;
    }
    cursor = next;
  }
}

async function read(path) {
  return readFile(resolve(root, path), 'utf8');
}
