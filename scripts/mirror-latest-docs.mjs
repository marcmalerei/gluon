import { cp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outputRoot = resolve(root, 'docs-site', 'dist');
const version = JSON.parse(await readFile(resolve(root, 'docs-site', 'versions.json'), 'utf8')).latest;

await rm(resolve(outputRoot, 'latest'), { recursive: true, force: true });
await cp(resolve(outputRoot, version), resolve(outputRoot, 'latest'), { recursive: true });
