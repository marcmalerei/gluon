import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { examplePreviews } from './preview-examples.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const previewScript = resolve(import.meta.dirname, 'preview-examples.mjs');

for (const [name, preview] of Object.entries(examplePreviews)) await verifyPreview(name, preview);

console.log(`example previews valid: ${Object.keys(examplePreviews).length} production builds served`);

async function verifyPreview(name, preview) {
  const child = spawn(process.execPath, [
    previewScript,
    name,
    '--host',
    '127.0.0.1',
    '--port',
    String(preview.port),
  ], { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });

  try {
    const url = `http://127.0.0.1:${preview.port}${preview.path}`;
    const response = await fetchUntilReady(url, child);
    const html = await response.text();
    if (!/^<!doctype html>/i.test(html) || !html.includes('<script type="module"')) {
      throw new Error(`${name} preview did not serve its production HTML entry.`);
    }
  } finally {
    if (child.exitCode == null && !child.killed) child.kill('SIGTERM');
    if (child.exitCode == null) await new Promise((resolveExit) => child.once('exit', resolveExit));
  }

  if (child.exitCode != null && child.exitCode !== 0 && child.signalCode !== 'SIGTERM') {
    throw new Error(`${name} preview exited with ${child.exitCode}.\n${output}`);
  }
}

async function fetchUntilReady(url, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Preview exited before serving ${url}.`);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}
