import type { PlaygroundProject } from './project.js';

export function createStarterTar(project: PlaygroundProject): Blob {
  const manifest = `${JSON.stringify({
    name: 'gluon-playground-reproduction', version: '0.0.0', private: true, type: 'module',
    scripts: { dev: 'vite', build: 'vite build', typecheck: 'tsc --noEmit', 'check:templates': 'gluon-template-check src' },
    dependencies: { '@gluonjs/core': '1.0.8', '@gluonjs/reactivity': '1.0.8' },
    devDependencies: { '@gluonjs/language-server': '1.0.8', '@gluonjs/vite': '1.0.8', typescript: '^5.7.0', vite: '^8.1.4' },
  }, null, 2)}\n`;
  const files = new Map([
    ['package.json', manifest],
    ['index.html', '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gluon reproduction</title></head><body><main id="app"></main><script type="module" src="/src/main.ts"></script></body></html>\n'],
    ['vite.config.ts', "import { defineConfig } from 'vite';\nimport gluon from '@gluonjs/vite';\n\nexport default defineConfig({ plugins: [gluon()] });\n"],
    ['tsconfig.json', `${JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true,
        useDefineForClassFields: true, skipLibCheck: true, noEmit: true,
      },
      include: ['src/**/*.ts', 'vite.config.ts'],
    }, null, 2)}\n`],
    ['src/app.ts', project.app],
    ['src/styles.ts', project.styles],
    ['src/main.ts', starterMain],
    ['README.md', '# Gluon Playground reproduction\n\nRun `npm install`, then `npm run typecheck`, `npm run check:templates`, and `npm run dev`.\n'],
  ]);
  const chunks: Uint8Array[] = [];
  for (const [name, content] of files) {
    const data = new TextEncoder().encode(content);
    chunks.push(tarHeader(name, data.length), data, new Uint8Array((512 - data.length % 512) % 512));
  }
  chunks.push(new Uint8Array(1024));
  return new Blob(chunks as BlobPart[], { type: 'application/x-tar' });
}

const starterMain = `import { createApp, type TemplateResult } from '@gluonjs/core';
import { ref } from '@gluonjs/reactivity';
import * as Application from './app.js';
import * as Styles from './styles.js';

type Renderer = (count: number, increment: () => void) => TemplateResult;
const candidates = Application as Record<string, unknown>;
const renderer = (candidates.default ?? candidates.App ?? candidates.Counter
  ?? Object.values(candidates).find((value) => typeof value === 'function')) as Renderer | undefined;
if (!renderer) throw new Error('GLUON_PLAYGROUND_RENDER_EXPORT_MISSING');

const sheets = Object.values(Styles).filter((value): value is CSSStyleSheet => value instanceof CSSStyleSheet);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, ...sheets];
const count = ref(2);
createApp(() => renderer(count.value, () => { count.value += 1; })).mount('#app');
`;

function tarHeader(name: string, size: number): Uint8Array {
  const header = new Uint8Array(512);
  write(header, 0, 100, name);
  write(header, 100, 8, '0000644\0');
  write(header, 108, 8, '0000000\0');
  write(header, 116, 8, '0000000\0');
  write(header, 124, 12, `${size.toString(8).padStart(11, '0')}\0`);
  write(header, 136, 12, '00000000000\0');
  header.fill(32, 148, 156);
  header[156] = '0'.charCodeAt(0);
  write(header, 257, 8, 'ustar\x00');
  write(header, 265, 32, 'gluon');
  write(header, 297, 32, 'gluon');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  write(header, 148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `);
  return header;
}

function write(target: Uint8Array, offset: number, length: number, value: string): void {
  target.set(new TextEncoder().encode(value).slice(0, length), offset);
}
