import { resolve } from 'node:path';
import { loadConfigFromFile } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configs = [
  'benchmarks/rendering/vite.config.ts',
  'benchmarks/components/vite.config.ts',
  'benchmarks/allocations/vite.config.ts',
];

for (const relativePath of configs) {
  const loaded = await loadConfigFromFile(
    { command: 'build', mode: 'production' },
    resolve(root, relativePath),
  );
  if (!loaded) throw new Error(`Could not load ${relativePath}.`);
  if (loaded.config.define?.__GLUON_DEV__ !== JSON.stringify(false)) {
    throw new Error(`${relativePath} must compile Gluon with __GLUON_DEV__ set to false.`);
  }
}

console.log(`Validated ${configs.length} comparative production benchmark configs.`);
