import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const siteRoot = resolve(root, 'docs-site');
const versions = JSON.parse(await readFile(resolve(siteRoot, 'versions.json'), 'utf8'));
const versionDirectories = [...versions.supported].sort();

if (!versionDirectories.includes(versions.latest)) {
  throw new Error(`latest docs version ${versions.latest} has no content directory`);
}

for (const version of versionDirectories) {
  await runVite(version);
}

function runVite(version) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [
      resolve(root, 'node_modules/vite/bin/vite.js'),
      'build',
      '--config',
      resolve(siteRoot, 'examples/vite.config.ts'),
    ], {
      cwd: root,
      env: { ...process.env, GLUON_DOCS_VERSION: version },
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun();
      else reject(new Error(`docs examples build for ${version} failed (${code ?? signal})`));
    });
  });
}
