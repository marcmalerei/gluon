import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const fixture = await mkdtemp(join(tmpdir(), 'gluon-trusted-types-package-'));

try {
  const packages = ['.', 'packages/reactivity', 'packages/router', 'packages/store', 'packages/ssr'];
  const tarballs = [];
  for (const packagePath of packages) {
    const packed = run('npm', ['pack', '--json', '--pack-destination', fixture], resolve(root, packagePath));
    const result = JSON.parse(packed)[0];
    tarballs.push(resolve(fixture, result.filename));
  }
  await writeFile(resolve(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2));
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', ...tarballs], fixture);

  await writeFile(resolve(fixture, 'index.mjs'), `
import { createApp, html, trustedHTML } from '@gluonjs/core';
import { renderToString } from '@gluonjs/ssr';
const app = createApp(() => html\`<main>\${trustedHTML('<strong>owned</strong>')}</main>\`);
app.config.trustedTypes = { policyName: 'fixture', policy: { name: 'fixture', createHTML: (value) => value } };
const rendered = await renderToString(html\`<section>\${trustedHTML('<i>packed</i>')}</section>\`);
if (!rendered.includes('<i>packed</i>')) throw new Error('packed SSR did not retain trustedHTML output');
console.log('packed Trusted Types runtime imports valid');
`);
  await writeFile(resolve(fixture, 'index.ts'), `
import { createApp, html, trustedHTML, type TrustedHtmlResult, type TrustedTypePolicy, type TrustedTypesConfig } from '@gluonjs/core';
const policy: TrustedTypePolicy = { name: 'fixture', createHTML: (value) => value };
const config = { policyName: 'fixture', policy } satisfies TrustedTypesConfig;
const value: TrustedHtmlResult = trustedHTML('<b>owned</b>');
const app = createApp(() => html\`<main>\${value}</main>\`);
app.config.trustedTypes = config;
`);
  await writeFile(resolve(fixture, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'NodeNext', moduleResolution: 'NodeNext',
      strict: true, noEmit: true, skipLibCheck: true,
    },
    include: ['index.ts'],
  }, null, 2));
  run(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], fixture);
  run(process.execPath, ['index.mjs'], fixture);

  const coreDeclaration = await readFile(resolve(fixture, 'node_modules/@gluonjs/core/dist/types/index.d.ts'), 'utf8');
  for (const symbol of ['trustedHTML', 'TrustedHtmlResult', 'TrustedTypePolicy', 'TrustedTypesConfig']) {
    if (!coreDeclaration.includes(symbol)) throw new Error(`packed core declarations omit ${symbol}`);
  }
  console.log(`Trusted Types clean-package fixture valid: ${tarballs.length} local tarballs, public types and SSR runtime`);
} finally {
  await rm(fixture, { recursive: true, force: true });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  return result.stdout;
}
