import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import {
  GLUON_DIAGNOSTIC_CATALOG_VERSION,
  formatGluonDiagnostic,
  getGluonDiagnostic,
  gluonDiagnosticCatalog,
  gluonDiagnosticReferenceUrl,
} from '../packages/compiler/src/diagnostics.js';
import { createStarterTar } from '../examples/playground/src/archive.js';
import {
  decodePlaygroundProject,
  defaultProject,
  encodePlaygroundProject,
  projectFromLocation,
} from '../examples/playground/src/project.js';

describe('versioned diagnostic catalog', () => {
  test('has complete full and compact lookups with production formatting', async () => {
    const artifact = JSON.parse(await readFile('docs/diagnostics/0.0.0.json', 'utf8'));
    expect(artifact.version).toBe(GLUON_DIAGNOSTIC_CATALOG_VERSION);
    expect(artifact.diagnostics).toEqual(gluonDiagnosticCatalog);
    for (const definition of gluonDiagnosticCatalog) {
      expect(getGluonDiagnostic(definition.code)).toBe(definition);
      expect(getGluonDiagnostic(definition.compactCode)).toBe(definition);
      expect(formatGluonDiagnostic(definition.code, '', { production: true })).toBe(definition.compactCode);
      expect(gluonDiagnosticReferenceUrl(definition.compactCode)).toContain(`/0.0.0/${definition.code}`);
      expect(definition.remediation.length).toBeGreaterThan(10);
    }
    expect(formatGluonDiagnostic('GLUON_UNKNOWN', 'detail')).toBe('GLUON_UNKNOWN: detail');
  });
});

describe('playground project transport', () => {
  test('round-trips Unicode projects through stable URL-safe payloads', () => {
    const project = { app: 'const label = "Grüße 🧪";', styles: 'body { color: #111; }' };
    const payload = encodePlaygroundProject(project);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodePlaygroundProject(payload)).toEqual(project);
    expect(projectFromLocation({ hash: `#p=${payload}` })).toEqual(project);
    expect(projectFromLocation({ hash: '#p=broken' })).toBe(defaultProject);
    expect(projectFromLocation({ hash: '' })).toBe(defaultProject);
  });

  test('downloads a real tar starter with aligned public package versions', async () => {
    const [rootManifest, reactivityManifest, languageServerManifest, viteManifest] = await Promise.all([
      readManifest('package.json'),
      readManifest('packages/reactivity/package.json'),
      readManifest('packages/language-server/package.json'),
      readManifest('packages/vite/package.json'),
    ]);
    const archive = createStarterTar(defaultProject);
    expect(archive.type).toBe('application/x-tar');
    const bytes = new Uint8Array(await archive.arrayBuffer());
    const files = readTar(bytes);
    expect([...files.keys()]).toEqual([
      'package.json', 'index.html', 'vite.config.ts', 'tsconfig.json',
      'src/app.ts', 'src/styles.ts', 'src/main.ts', 'README.md',
    ]);
    const manifest = JSON.parse(files.get('package.json')!);
    expect(manifest.dependencies).toEqual({
      '@gluonjs/core': rootManifest.version,
      '@gluonjs/reactivity': reactivityManifest.version,
    });
    expect(manifest.devDependencies).toEqual({
      '@gluonjs/language-server': languageServerManifest.version,
      '@gluonjs/vite': viteManifest.version,
      typescript: rootManifest.devDependencies.typescript,
      vite: rootManifest.devDependencies.vite,
    });
    expect(manifest.scripts['check:templates']).toBe('gluon-template-check src');
    expect(files.get('src/main.ts')).toContain("from '@gluonjs/core'");
    expect(files.get('src/main.ts')).toContain("from '@gluonjs/reactivity'");
    expect(files.get('vite.config.ts')).toContain("from '@gluonjs/vite'");
  });
});

async function readManifest(path: string): Promise<{ version: string; devDependencies: Record<string, string> }> {
  return JSON.parse(await readFile(path, 'utf8')) as { version: string; devDependencies: Record<string, string> };
}

function readTar(bytes: Uint8Array): Map<string, string> {
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let offset = 0; offset + 512 <= bytes.length;) {
    const header = bytes.subarray(offset, offset + 512);
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    if (!name) break;
    const size = Number.parseInt(decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim(), 8);
    offset += 512;
    files.set(name, decoder.decode(bytes.subarray(offset, offset + size)));
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}
