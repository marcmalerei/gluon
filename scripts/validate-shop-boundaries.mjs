import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const shopRoot = resolve(root, 'examples/shop');
const sourceRoot = resolve(shopRoot, 'src');
const allowedPackages = new Set([
  '@gluonjs/core',
  '@gluonjs/core/decorators',
  '@gluonjs/atoms',
  '@gluonjs/quarks',
  '@gluonjs/atoms',
  '@gluonjs/molecules',
  '@gluonjs/organisms',
  '@gluonjs/reactivity',
  '@gluonjs/router',
  '@gluonjs/ssr',
  '@gluonjs/ssr/hydration',
  '@gluonjs/store',
]);
const sourceFiles = await collectFiles(sourceRoot);

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const specifier = match[1] ?? match[2];
    if (!specifier || specifier.startsWith('.')) continue;
    if (!allowedPackages.has(specifier)) {
      throw new Error(`Shop source uses a non-public or undeclared package import: ${specifier}`);
    }
  }
  if (source.includes('<style')) {
    throw new Error(`Shop source cannot create <style> fallback elements: ${file}`);
  }
  if (source.includes('.gluon-')) {
    throw new Error(`Shop source cannot depend on undocumented .gluon-* implementation classes: ${file}`);
  }
}

const html = await readFile(resolve(shopRoot, 'index.html'), 'utf8');
if (/<style\b/i.test(html)) {
  throw new Error('The shop document cannot contain a <style> fallback.');
}

console.log(`shop boundaries valid: ${sourceFiles.length} source files, public imports only`);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (extname(entry.name) === '.ts') files.push(path);
  }
  return files;
}
