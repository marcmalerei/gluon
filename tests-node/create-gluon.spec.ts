import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, expect, test } from 'vitest';
import {
  ScaffoldError,
  helpText,
  normalizeFeatures,
  parseCliArguments,
  runCli,
  scaffoldProject,
} from '../packages/create-gluon/src/index.js';

describe('create-gluon arguments', () => {
  test('parses the documented non-interactive feature flags', () => {
    const parsed = parseCliArguments([
      'catalog', '--yes', '--name', '@team/catalog', '--router', '--store',
      '--testing', '--ui', '--ssr', '--force',
    ]);
    expect(parsed).toMatchObject({
      directory: 'catalog',
      name: '@team/catalog',
      yes: true,
      force: true,
      router: true,
      store: true,
      testing: true,
      ui: true,
      ssr: true,
    });
  });

  test('rejects conflicts and unknown arguments', () => {
    expect(() => parseCliArguments(['app', '--router', '--no-router'])).toThrow(ScaffoldError);
    expect(() => parseCliArguments(['app', '--ssr', '--no-store'])).toThrow(
      'INVALID_COMBINATION',
    );
    expect(() => parseCliArguments(['app', '--unknown'])).toThrow('CLI_ARGUMENT_UNKNOWN');
    expect(() => parseCliArguments(['app', '-x'])).toThrow('CLI_ARGUMENT_UNKNOWN');
    expect(() => parseCliArguments(['app', 'extra'])).toThrow('CLI_ARGUMENT_EXTRA');
    expect(() => parseCliArguments(['app', '--name'])).toThrow('CLI_ARGUMENT_MISSING');
    expect(() => parseCliArguments(['-h'])).not.toThrow();
    expect(parseCliArguments(['-v']).version).toBe(true);
    expect(parseCliArguments(['app', '-y']).yes).toBe(true);
  });

  test('normalizes SSR to its verified Router and Store requirements', () => {
    expect(normalizeFeatures({ ssr: true })).toEqual({
      router: true,
      store: true,
      testing: false,
      ui: false,
      ssr: true,
    });
  });
});

describe('create-gluon scaffolding', () => {
  test('writes the minimal public-boundary starter', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-minimal-'));
    const result = await scaffoldProject({ directory: 'starter', cwd });
    const manifest = JSON.parse(await readFile(join(result.directory, 'package.json'), 'utf8'));
    const app = await readFile(join(result.directory, 'src/app.ts'), 'utf8');
    const quantityControl = await readFile(join(result.directory, 'src/quantity-control.ts'), 'utf8');
    expect(result.features).toEqual({
      router: false,
      store: false,
      testing: false,
      ui: false,
      ssr: false,
    });
    expect(manifest.dependencies).toEqual({ '@gluonjs/core': '0.0.0' });
    expect(manifest.scripts).toMatchObject({ test: 'npm run typecheck', build: 'vite build' });
    expect(app).toContain("from '@gluonjs/core'");
    expect(app).not.toContain('/src/');
    expect(quantityControl).toContain('defineGluonElement');
    expect(quantityControl).toContain('formAssociated: true');
    expect(quantityControl).toContain("elementEvent<{ quantity: number }>({ cancelable: true })");
  });

  test('writes the universal testing and UI surfaces', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-universal-'));
    const result = await scaffoldProject({
      directory: 'starter',
      cwd,
      ssr: true,
      testing: true,
      ui: true,
    });
    const manifest = JSON.parse(await readFile(join(result.directory, 'package.json'), 'utf8'));
    const app = await readFile(join(result.directory, 'src/app.ts'), 'utf8');
    const server = await readFile(join(result.directory, 'src/server.ts'), 'utf8');
    expect(result.features).toEqual({
      router: true,
      store: true,
      testing: true,
      ui: true,
      ssr: true,
    });
    expect(manifest.dependencies).toMatchObject({
      '@gluonjs/core': '0.0.0',
      '@gluonjs/atoms': '0.0.0',
      '@gluonjs/router': '0.0.0',
      '@gluonjs/store': '0.0.0',
      '@gluonjs/ssr': '0.0.0',
    });
    expect(app).toContain("from '@gluonjs/atoms'");
    expect(server).toContain("from '@gluonjs/ssr'");
    expect(result.files).toContain('vitest.config.ts');
  });

  test('protects non-empty targets and invalid package names', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-errors-'));
    const target = join(cwd, 'existing');
    await scaffoldProject({ directory: target });
    await expect(scaffoldProject({ directory: target })).rejects.toMatchObject({
      code: 'DIRECTORY_NOT_EMPTY',
    });
    await expect(scaffoldProject({ directory: 'valid', name: 'Invalid Name', cwd })).rejects
      .toMatchObject({ code: 'INVALID_PROJECT_NAME' });
    await expect(scaffoldProject({ directory: '', cwd })).rejects
      .toMatchObject({ code: 'INVALID_DIRECTORY' });
    await expect(scaffoldProject({ directory: 'bad\0path', cwd })).rejects
      .toMatchObject({ code: 'INVALID_DIRECTORY' });
  });

  test('supports force for maintained file refreshes', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-force-'));
    const result = await scaffoldProject({ directory: 'starter', cwd });
    await writeFile(join(result.directory, 'src/app.ts'), 'old');
    await scaffoldProject({ directory: 'starter', cwd, force: true, router: true });
    expect(await readFile(join(result.directory, 'src/app.ts'), 'utf8')).toContain('RouterView');
  });
});

test('runCli exposes help and stable --yes behavior', async () => {
  const output = new PassThrough();
  let written = '';
  output.on('data', (chunk) => { written += chunk.toString(); });
  await runCli(['--help'], { output });
  expect(written).toBe(helpText);

  written = '';
  await runCli(['--version'], { output });
  expect(written).toBe('0.0.0\n');

  written = '';
  const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-cli-'));
  const result = await runCli(['app', '--yes', '--router'], { cwd, output });
  expect(result?.features.router).toBe(true);
  expect(written).toContain('Next: npm install && npm run dev');

  const universal = await runCli(['universal', '--yes', '--ssr'], { cwd, output });
  expect(universal?.features).toMatchObject({ router: true, store: true, ssr: true });

  await expect(runCli(['--yes'], { cwd, output })).rejects.toThrow('CLI_ARGUMENT_MISSING');
});

test('runCli collects interactive feature choices', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-interactive-'));
  const output = new PassThrough();
  const answers = ['interactive-app', '', 'y', 'n', 'y', 'n'];
  const result = await runCli([], {
    cwd,
    output,
    prompt: { question: async () => answers.shift() ?? '', close() {} },
  });
  expect(result?.features).toEqual({
    router: true,
    store: true,
    testing: false,
    ui: true,
    ssr: false,
  });
});

test('runCli rejects empty and invalid interactive answers', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-interactive-errors-'));
  await expect(runCli([], {
    cwd,
    output: new PassThrough(),
    prompt: { question: async () => '', close() {} },
  })).rejects
    .toMatchObject({ code: 'INVALID_DIRECTORY' });

  const answers = ['app', 'maybe'];
  await expect(runCli([], {
    cwd,
    output: new PassThrough(),
    prompt: { question: async () => answers.shift() ?? '', close() {} },
  })).rejects
    .toThrow('CLI_ANSWER_INVALID');
});
