import { readdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.tmp/router-lazy-build');

try {
  await build({
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: {
        '@gluonjs/core': resolve(root, 'src/index.ts'),
      },
    },
    build: {
      emptyOutDir: true,
      minify: false,
      outDir: output,
      rollupOptions: {
        input: resolve(root, 'tests-fixtures/router-lazy/main.ts'),
        output: {
          entryFileNames: 'main.js',
          chunkFileNames: '[name]-[hash].js',
        },
      },
    },
  });

  const files = await readdir(output);
  const lazyChunk = files.find((file) => /^page-.+\.js$/.test(file));
  if (!lazyChunk) throw new Error('The router lazy fixture did not emit a separate page chunk.');
  const entry = await readFile(resolve(output, 'main.js'), 'utf8');
  if (!entry.includes(`import("./${lazyChunk}")`)) {
    throw new Error('The router entry does not retain a dynamic import for the lazy page chunk.');
  }
  console.log(`router lazy build valid: main.js + ${lazyChunk}`);
} finally {
  await rm(output, { force: true, recursive: true });
}
