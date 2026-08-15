import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const contract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const rootPackage = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const matrix = await readFile(resolve(root, 'docs/support-matrix.md'), 'utf8');
const failures = [];

for (const entry of contract.packages.filter(({ state }) => state === 'current')) {
  if (!matrix.includes(`\`${entry.name}\``)) failures.push(`support matrix omits ${entry.name}`);
}
if (!matrix.includes(`**${rootPackage.version}**`)) failures.push(`support matrix does not name current package line ${rootPackage.version}`);
for (const required of ['Chromium', 'Firefox', 'WebKit', 'adoptedStyleSheets', 'WCAG', 'assistive technology', 'SSR']) {
  if (!matrix.toLowerCase().includes(required.toLowerCase())) failures.push(`support matrix omits ${required}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`support matrix valid for ${contract.packages.filter(({ state }) => state === 'current').length} packages on ${rootPackage.version}`);
}
