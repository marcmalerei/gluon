import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { chromium, type Browser } from 'playwright';
import { afterEach, describe, expect, it } from 'vitest';
import { build, createServer, preview, type Rollup } from 'vite';
import {
  formatGluonDiagnostic,
  compileGluonSfc,
  GluonSfcCompileError,
  getGluonDiagnostic,
  gluonDiagnosticCatalog,
  gluonDiagnosticReferenceUrl,
  transformGluonModule,
  transpileGluonDecorators,
} from '@gluonjs/compiler';
import gluon from '@gluonjs/vite';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryDirectories: string[] = [];
const browsers: Browser[] = [];

afterEach(async () => {
  await Promise.all(browsers.splice(0).map((browser) => browser.close()));
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    force: true,
    recursive: true,
  })));
});

describe('@gluonjs/compiler', () => {
  it('lowers presentational SFCs to explicit Gluon runtime contracts', () => {
    const compiled = compileGluonSfc(`
<script lang="ts">
import type { TemplateValue } from '@gluonjs/core';
export interface TextLinkProps {
  readonly href?: string;
  readonly children?: TemplateValue;
}
</script>
<template component="TextLink" layer="atom" props="TextLinkProps">
  <component :is="href ? 'a' : 'span'" :href="href" class="text-link"><slot /></component>
</template>
<style id="docs-text-link" order="12">
  .text-link { text-underline-offset: 0.2em; }
</style>
`, { filename: '/app/TextLink.gluon' });

    expect(compiled).toMatchObject({
      componentName: 'TextLink',
      layer: 'atom',
      styleId: 'docs-text-link',
    });
    expect(compiled.code).toContain("defineAtom(");
    expect(compiled.code).toContain("quark(props.href ? 'a' : 'span')");
    expect(compiled.code).toContain('children: props.children');
    expect(compiled.code).toContain('createComponentStyleDependency({');
    expect(compiled.code).toContain('sheet: TextLinkStyle');
    expect(compiled.code).toContain('export default TextLink');
    expect(transformGluonModule(compiled.code, '/app/TextLink.gluon.ts').templates)
      .toHaveLength(1);
  });

  it('lowers interpolation and rejects stateful or ambiguous SFC forms', () => {
    const compiled = compileGluonSfc(`
<script lang="ts">
export interface BadgeProps { readonly label: string; }
</script>
<template component="Badge" layer="molecule" props="BadgeProps">
  <strong>{{ label }}</strong>
</template>
`, { filename: '/app/Badge.gluon' });
    expect(compiled.code).toContain('defineMolecule(');
    expect(compiled.code).toContain('<strong>${props.label}</strong>');

    expect(() => compileGluonSfc(`
<script setup>const state = 1;</script>
<template component="Stateful" layer="organism"><p>{{ state }}</p></template>
`, { filename: '/app/Stateful.gluon' })).toThrow(GluonSfcCompileError);
    expect(() => compileGluonSfc(`
<template component="Broken" layer="atom"><component :is="resolveTag()">Broken</component></template>
`, { filename: '/app/Broken.gluon' })).toThrow(/:is supports/i);
  });

  it('rejects unsupported SFC blocks, metadata, styles, and template shapes', () => {
    const invalidSources = [
      ['missing template', '<script>export const value = 1;</script>'],
      ['malformed blocks', '<template component="Broken" layer="atom"><p>'],
      ['script setup', '<script setup>const value = 1;</script><template component="Broken" layer="atom"><p>Broken</p></template>'],
      ['custom block', '<template component="Broken" layer="atom"><p>Broken</p></template><docs>Unsupported</docs>'],
      ['multiple styles', '<template component="Broken" layer="atom"><p>Broken</p></template><style id="one">.one {}</style><style id="two">.two {}</style>'],
      ['external script', '<script src="./logic.ts"></script><template component="Broken" layer="atom"><p>Broken</p></template>'],
      ['script language', '<script lang="tsx">export const value = 1;</script><template component="Broken" layer="atom"><p>Broken</p></template>'],
      ['template language', '<template lang="pug" component="Broken" layer="atom">p Broken</template>'],
      ['style language', '<template component="Broken" layer="atom"><p>Broken</p></template><style lang="scss" id="broken">.x { color: red; }</style>'],
      ['scoped style', '<template component="Broken" layer="atom"><p>Broken</p></template><style scoped id="broken">.x { color: red; }</style>'],
      ['missing component', '<template layer="atom"><p>Broken</p></template>'],
      ['invalid props', '<template component="Broken" layer="atom" props="not-valid"><p>Broken</p></template>'],
      ['invalid layer', '<template component="Broken" layer="page"><p>Broken</p></template>'],
      ['missing style id', '<template component="Broken" layer="atom"><p>Broken</p></template><style>.x {}</style>'],
      ['invalid style order', '<template component="Broken" layer="atom"><p>Broken</p></template><style id="broken" order="-1">.x { color: red; }</style>'],
      ['nested dynamic root', '<template component="Broken" layer="atom"><div><component :is="tag">Broken</component></div></template>'],
      ['unsupported slot', '<template component="Broken" layer="atom"><slot name="title" /></template>'],
      ['dynamic attributes', '<template component="Broken" layer="atom"><component :is="tag" v-bind="attrs">Broken</component></template>'],
      ['dynamic children', '<template component="Broken" layer="atom"><component :is="tag"><strong>Broken</strong></component></template>'],
    ] as const;

    for (const [label, source] of invalidSources) {
      expect(
        () => compileGluonSfc(source, { filename: `/app/${label}.gluon` }),
        label,
      ).toThrow(GluonSfcCompileError);
    }
  });

  it('supports default props, fixed interpolation, and identifier-selected native roots', () => {
    const plain = compileGluonSfc(
      '<template component="Message" layer="organism"><p>{{ label }}</p></template>',
      { filename: '/app/Message.gluon' },
    );
    expect(plain.code).toContain('export interface GluonSfcProps');
    expect(plain.code).toContain('defineOrganism(');

    const dynamic = compileGluonSfc(
      '<template component="Dynamic" layer="atom"><component :is="tag" title="Status">{{ label }}</component></template>',
      { filename: '/app/Dynamic.gluon' },
    );
    expect(dynamic.code).toContain("quark(props.tag)");
    expect(dynamic.code).toContain('title: "Status"');
    expect(dynamic.code).toContain('children: props.label');
  });

  it('resolves, formats, and links the public diagnostic catalog', () => {
    const definition = gluonDiagnosticCatalog[0]!;
    expect(getGluonDiagnostic(definition.code)).toBe(definition);
    expect(getGluonDiagnostic(definition.compactCode)).toBe(definition);
    expect(getGluonDiagnostic('GLUON_UNKNOWN')).toBeUndefined();
    expect(formatGluonDiagnostic(definition.code)).toContain(definition.summary);
    expect(formatGluonDiagnostic(definition.code, 'detail')).toBe(`${definition.code}: detail`);
    expect(formatGluonDiagnostic(definition.code, '', { production: true })).toBe(definition.compactCode);
    expect(formatGluonDiagnostic(definition.code, 'detail', { production: true })).toBe(`${definition.compactCode}: detail`);
    expect(formatGluonDiagnostic('GLUON_UNKNOWN')).toBe('GLUON_UNKNOWN');
    expect(formatGluonDiagnostic('GLUON_UNKNOWN', 'detail')).toBe('GLUON_UNKNOWN: detail');
    expect(gluonDiagnosticReferenceUrl(definition.compactCode, '/reference/')).toContain(`/1.0.0/${definition.code}`);
    expect(gluonDiagnosticReferenceUrl('GLUON UNKNOWN')).toMatch(/\/GLUON%20UNKNOWN$/);
  });

  it('maps template expressions and adds development-only stable identities', () => {
    const id = '/app/product-card.ts';
    const source = [
      "import { css as sheet, defineElement as register, defineGluonElement as registerFunctional, GluonElement, html as view } from '@gluonjs/core';",
      "import { defineStore as storeDefinition } from '@gluonjs/store';",
      "export const state = storeDefinition({ id: 'card', state: () => ({ count: 1 }) });",
      'export class ProductCard extends GluonElement {',
      "  static styles = sheet`:host { color: blue; }`;",
      '  declare selected: boolean;',
      '  protected render() {',
      '    return view`<button>${state.options.id}</button>`;',
      '  }',
      '}',
      "register('product-card', ProductCard);",
      "registerFunctional({ tagName: 'quantity-control', setup: () => ({ render: () => view`<output>${state.id}</output>` }) });",
      'export function Price() { return view`<output>${state.options.id}</output>`; }',
      'export const Badge = () => view`<mark>${state.id}</mark>`;',
    ].join('\n');
    const transformed = transformGluonModule(source, id, { development: true });
    expect(transformed.hmr).toBe(true);
    expect(transformed.code).toContain('from "virtual:gluon-hmr"');
    expect(transformed.code).toContain('__gluonHmrStyle(sheet`');
    expect(transformed.code).toContain('__gluonHmrStore(storeDefinition(');
    expect(transformed.code).toContain('__gluonHmrElement(register,');
    expect(transformed.code).toContain('__gluonHmrFunctionalElement(registerFunctional,');
    expect(transformed.code).toContain('ProductCard, undefined, import.meta.url');
    expect(transformed.code).toContain('}) }, undefined, import.meta.url');
    expect(transformed.code).toContain('declare selected: boolean;');
    expect(transformed.code).toContain('import.meta.hot.accept');
    expect(transformed.code).toContain('Badge = __gluonHmrComponent(');
    expect(transformed.templates).toHaveLength(5);
    expect(transformed.templates[1]?.parts).toHaveLength(1);

    const generatedOffset = transformed.code.indexOf('state.options.id');
    const generatedPrefix = transformed.code.slice(0, generatedOffset);
    const generatedLine = generatedPrefix.split('\n').length;
    const generatedColumn = generatedPrefix.length - generatedPrefix.lastIndexOf('\n') - 1;
    const original = originalPositionFor(new TraceMap(transformed.map), {
      line: generatedLine,
      column: generatedColumn,
    });
    expect(original.source).toBe('product-card.ts');
    expect(original.line).toBe(8);
    expect(original.column).toBe(26);
  });

  it('retains explicit scoped registry options through development HMR transforms', () => {
    const source = [
      "import { defineElement, defineGluonElement, GluonElement, html } from '@gluonjs/core';",
      'const registry = globalThis.registry;',
      'class ScopedCard extends GluonElement { protected render() { return html`Scoped`; } }',
      "defineElement('scoped-card', ScopedCard, { registry });",
      "defineGluonElement({ tagName: 'scoped-quantity', setup: () => ({ render: () => html`Quantity` }) }, { registry });",
    ].join('\n');
    const transformed = transformGluonModule(source, '/app/scoped-elements.ts', { development: true });
    expect(transformed.code).toContain(
      "__gluonHmrElement(defineElement, 'scoped-card', ScopedCard, { registry }, import.meta.url",
    );
    expect(transformed.code).toContain(
      "__gluonHmrFunctionalElement(defineGluonElement, { tagName: 'scoped-quantity'",
    );
    expect(transformed.code).toContain('}, { registry }, import.meta.url');
  });

  it('reports inline style locations and leaves production modules free of HMR hooks', () => {
    const id = '/app/invalid.ts';
    const source = [
      "import { html } from '@gluonjs/core';",
      'export const page = () => html`',
      '  <style>p { color: red; }</style>',
      '  <p>Invalid</p>',
      '`;',
    ].join('\n');
    const transformed = transformGluonModule(source, id, { development: false });
    expect(transformed.hmr).toBe(false);
    expect(transformed.code).toBe(source);
    expect(transformed.diagnostics).toEqual([
      expect.objectContaining({
        code: 'GLUON_TEMPLATE_STYLE_ELEMENT',
        location: expect.objectContaining({ line: 3 }),
      }),
    ]);
    expect(transformed.code).not.toContain('virtual:gluon-hmr');
    expect(transformed.code).not.toContain('import.meta.hot');
    expect(transformed.map.sourcesContent).toEqual([source]);
  });

  it('marks only compiler-proven declared-property text templates for direct updates', () => {
    const eligible = transformGluonModule([
      "import { GluonElement as Base, html as view } from '@gluonjs/core';",
      'class LabelCard extends Base {',
      "  static override readonly properties = { label: { type: String, default: 'A' } } as const;",
      '  declare label: string;',
      '  protected override render() {',
      '    return view`<output>${this.label}</output>`;',
      '  }',
      '}',
    ].join('\n'), '/app/label-card.ts', { development: false });
    expect(eligible.hmr).toBe(false);
    expect(eligible.code).toContain('markCompiledPrimitiveTextBinding as __gluonMarkPrimitiveText');
    expect(eligible.code).toContain('__gluonMarkPrimitiveText(view`<output>${this.label}</output>`, "label", 0)');
    expect(eligible.code).not.toContain('virtual:gluon-hmr');

    const stableEvent = transformGluonModule([
      "import { GluonElement, html as view } from '@gluonjs/core';",
      'class CounterCard extends GluonElement {',
      '  static properties = { count: { attribute: false, default: 0 } };',
      '  declare count: number;',
      '  private readonly click = () => { this.count += 1; };',
      '  protected render() { return view`<button @click=${this.click}>${this.count}</button>`; }',
      '}',
    ].join('\n'), '/app/counter-card.ts', { development: false });
    expect(stableEvent.code).toContain('__gluonMarkPrimitiveText(view`<button @click=${this.click}>${this.count}</button>`, "count", 1)');

    const ineligibleBodies = [
      'return view`<output title=${this.label}>fixed</output>`;',
      'return this.active ? view`<output>${this.label}</output>` : view`<output>off</output>`;',
      'return view`<output>${this.label}:${this.label}</output>`;',
    ];
    for (const body of ineligibleBodies) {
      const transformed = transformGluonModule([
        "import { GluonElement, html as view } from '@gluonjs/core';",
        'class LabelCard extends GluonElement {',
        "  static properties = { label: { default: 'A' } };",
        '  declare label: string;',
        `  protected render() { ${body} }`,
        '}',
      ].join('\n'), '/app/ineligible-card.ts', { development: false });
      expect(transformed.code).not.toContain('__gluonMarkPrimitiveText');
    }

    const customUpdate = transformGluonModule([
      "import { GluonElement, html as view } from '@gluonjs/core';",
      'class LabelCard extends GluonElement {',
      "  static properties = { label: { default: 'A' } };",
      '  declare label: string;',
      '  protected update() { super.update(); }',
      '  protected render() { return view`<output>${this.label}</output>`; }',
      '}',
    ].join('\n'), '/app/custom-update-card.ts', { development: false });
    expect(customUpdate.code).not.toContain('__gluonMarkPrimitiveText');
  });

  it('records compose template bodies and preserves their original source mappings', () => {
    const id = '/app/checkout.ts';
    const source = [
      "import { compose as nest, html } from '@gluonjs/core';",
      "const Panel = (props: { children: unknown }) => html`<section>${props.children as never}</section>`;",
      'export const Checkout = () => nest(Panel, {})`',
      '  <button>Pay</button>',
      '`;',
    ].join('\n');
    const transformed = transformGluonModule(source, id, { development: true });
    expect(transformed.templates.map((template) => template.tag)).toEqual(['html', 'compose']);
    expect(transformed.templates[1]?.start.line).toBe(3);
    expect(transformed.code).toContain('nest(Panel, {})`');
    expect(transformed.map.sourcesContent).toEqual([source]);
  });

  it('transforms aliased custom-element decorators for HMR and transpiles standard decorators', () => {
    const source = [
      "import { GluonElement } from '@gluonjs/core';",
      "import { customElement as register, property } from '@gluonjs/core/decorators';",
      "@register('decorated-card')",
      'export class DecoratedCard extends GluonElement {',
      '  @property({ reflect: true }) accessor active = false;',
      '}',
    ].join('\n');
    const transformed = transformGluonModule(source, '/app/decorated-card.ts', { development: true });
    expect(transformed.decorators).toBe(true);
    expect(transformed.code).toContain('@__gluonHmrElementDecorator(register,');
    expect(transformed.code).toContain('elementDecorator as __gluonHmrElementDecorator');
    const transpiled = transpileGluonDecorators(transformed.code, '/app/decorated-card.ts');
    expect(transpiled.code).not.toContain('@register');
    expect(transpiled.code).not.toMatch(/\n\s*@property/);
    expect(transpiled.code).toContain('__esDecorate');
    expect(transpiled.map?.sourcesContent).toEqual([transformed.code]);
  });

  it('reports source-located functional element tag, cleanup, and lifecycle ownership mistakes', () => {
    const source = `
      import { defineGluonElement, html } from '@gluonjs/core';
      defineGluonElement({
        tagName: 'Invalid',
        setup(context) {
          window.addEventListener('resize', () => undefined);
          queueMicrotask(() => context.onUpdated(() => undefined));
          return { render: () => html\`<p>Invalid</p>\` };
        },
      });
    `;
    const transformed = transformGluonModule(source, '/app/invalid-element.ts');
    expect(transformed.diagnostics.map(({ code }) => code)).toEqual([
      'GLUON_ELEMENT_TAG_INVALID',
      'GLUON_ELEMENT_SETUP_CLEANUP_MISSING',
      'GLUON_ELEMENT_SETUP_LIFECYCLE_DEFERRED',
    ]);
    for (const diagnostic of transformed.diagnostics) {
      expect(diagnostic.location.line).toBeGreaterThan(1);
      expect(diagnostic.location.column).toBeGreaterThan(0);
    }

    const valid = transformGluonModule(`
      import { defineGluonElement, html } from '@gluonjs/core';
      defineGluonElement({
        tagName: 'valid-element',
        setup(context) {
          const listener = () => undefined;
          window.addEventListener('resize', listener);
          context.onCleanup(() => window.removeEventListener('resize', listener));
          context.onUpdated(() => undefined);
          return { render: () => html\`<p>Valid</p>\` };
        },
      });
    `, '/app/valid-element.ts');
    expect(valid.diagnostics).toEqual([]);
  });
});

describe('@gluonjs/vite real server contract', () => {
  it('preserves element and Store state while template, logic, and adopted CSS update', async () => {
    const root = await createFixture('one', 1, 'rgb(1, 2, 3)');
    const server = await createServer(viteConfig(root));
    await server.listen();
    try {
      const browser = await chromium.launch({ headless: true });
      browsers.push(browser);
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(server.resolvedUrls!.local[0]!);
      const button = page.locator('gluon-hmr-counter').locator('button');
      const functional = page.locator('#functional output');
      await expect.poll(() => button.textContent()).toBe('Version one: 0');
      await expect.poll(() => functional.textContent()).toBe('Function one: 0');
      await button.click();
      await expect.poll(() => button.textContent()).toBe('Version one: 1');
      await expect.poll(() => functional.textContent()).toBe('Function one: 1');
      const originalElement = await page.locator('gluon-hmr-counter').evaluate((element) => {
        (element as HTMLElement & { marker?: string }).marker = 'stable-element';
        return element.localName;
      });
      expect(originalElement).toBe('gluon-hmr-counter');

      await writeFile(resolve(root, 'component.ts'), componentSource('two', 2, 'rgb(4, 5, 6)'));
      await expect.poll(() => button.textContent(), { timeout: 15_000 }).toBe('Version two: 1');
      await expect.poll(() => functional.textContent()).toBe('Function two: 1');
      expect(await page.locator('gluon-hmr-counter').evaluate((element) => (
        element as HTMLElement & { marker?: string }
      ).marker)).toBe('stable-element');
      expect(await page.evaluate(() => (window as Window & { __gluonLoads?: number }).__gluonLoads)).toBe(1);
      expect(await button.evaluate((element) => getComputedStyle(element).color)).toBe('rgb(4, 5, 6)');
      await button.click();
      await expect.poll(() => button.textContent()).toBe('Version two: 3');
      expect(errors).toEqual([]);
    } finally {
      await server.close();
    }
  }, 30_000);

  it('emits a production bundle without development HMR hooks', async () => {
    const root = await createFixture('production', 1, 'rgb(7, 8, 9)');
    const output = await build({
      ...viteConfig(root),
      logLevel: 'silent',
      build: { minify: false, sourcemap: true, write: false },
    });
    const outputs = Array.isArray(output) ? output : [output];
    const code = outputs
      .flatMap((entry) => (entry as Rollup.RollupOutput).output)
      .filter((entry): entry is Rollup.OutputChunk => entry.type === 'chunk')
      .map((entry) => entry.code)
      .join('\n');
    expect(code).toContain('Version production');
    expect(code).not.toContain('virtual:gluon-hmr');
    expect(code).not.toContain('__gluonHmr');
    expect(code).not.toContain('import.meta.hot');
    expect(code).not.toContain('__GLUON_DEV__');
    expect(code).not.toContain('renderDebugHook');
    expect(code).not.toContain('pendingRenderCauses');
    expect(code).not.toContain('GLUON_TEMPLATE_STYLE_ELEMENT');
  }, 30_000);

  it('executes compiled primitive updates and recovers through the production render path', async () => {
    const root = await createPrimitiveFixture();
    await build({
      ...viteConfig(root),
      build: { outDir: resolve(root, 'dist') },
    });
    const server = await preview({
      ...viteConfig(root),
      preview: { host: '127.0.0.1', port: 0 },
    });
    try {
      const browser = await chromium.launch({ headless: true });
      browsers.push(browser);
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(server.resolvedUrls!.local[0]!);
      const result = await page.evaluate(async () => {
        const elements = [...document.querySelectorAll('compiled-label')] as Array<HTMLElement & {
          label: string;
          updateComplete: Promise<void>;
          shadowRoot: ShadowRoot;
        }>;
        const element = elements[0]!;
        const second = elements[1]!;
        const prototype = Object.getPrototypeOf(element) as { render: () => unknown };
        const render = prototype.render;
        prototype.render = () => { throw new Error('compiled update rerendered'); };
        second.label = 'Second B';
        element.label = 'B';
        await Promise.all([element.updateComplete, second.updateComplete]);
        const compiledText = [element.shadowRoot.textContent, second.shadowRoot.textContent];

        prototype.render = render;
        element.shadowRoot.replaceChildren(document.createElement('i'));
        element.label = 'C';
        await element.updateComplete;
        second.label = 'Disconnected';
        const disconnectedUpdate = second.updateComplete;
        second.remove();
        await disconnectedUpdate;
        document.body.append(second);
        await second.updateComplete;
        return {
          compiledText,
          recoveredText: element.shadowRoot.textContent,
          reconnectedText: second.shadowRoot.textContent,
        };
      });
      expect(result).toEqual({
        compiledText: ['B', 'Second B'],
        recoveredText: 'C',
        reconnectedText: 'Disconnected',
      });
      expect(errors).toEqual([]);
    } finally {
      await server.close();
    }
  }, 30_000);

  it('emits a deterministic universal client asset manifest', async () => {
    const root = await createFixture('universal', 1, 'rgb(9, 8, 7)');
    const mainFile = resolve(root, 'main.ts');
    await writeFile(mainFile, `${await readFile(mainFile, 'utf8')}\nimport './universal.css';\nvoid new URL('./universal.svg', import.meta.url);\n`);
    await writeFile(resolve(root, 'universal.css'), 'body { color: black; }');
    await writeFile(resolve(root, 'universal.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const config = viteConfig(root);
    const output = await build({
      ...config,
      plugins: [gluon({ universal: true })],
      build: { write: false },
    });
    const outputs = Array.isArray(output) ? output : [output];
    const asset = outputs
      .flatMap((entry) => (entry as Rollup.RollupOutput).output)
      .find((entry): entry is Rollup.OutputAsset => entry.type === 'asset' && entry.fileName === 'gluon-assets.json');
    expect(asset).toBeDefined();
    const manifest = JSON.parse(String(asset!.source));
    expect(manifest).toEqual(expect.objectContaining({ version: 1 }));
    expect(manifest.entry).toMatch(/^\/assets\/.*\.js$/);
    expect(manifest.imports).toEqual(expect.any(Array));

    const customOutput = await build({
      ...config,
      plugins: [gluon({ universal: { manifestFile: 'custom-assets.json' } })],
      build: { write: false },
    });
    const customOutputs = Array.isArray(customOutput) ? customOutput : [customOutput];
    expect(customOutputs
      .flatMap((entry) => (entry as Rollup.RollupOutput).output)
      .some((entry) => entry.type === 'asset' && entry.fileName === 'custom-assets.json')).toBe(true);
  });
});

async function createFixture(version: string, increment: number, color: string): Promise<string> {
  const root = await mkdtemp(resolve(repositoryRoot, '.tmp-gluon-vite-'));
  temporaryDirectories.push(root);
  await writeFile(resolve(root, 'index.html'), '<main id="app"></main><aside id="functional"></aside><script type="module" src="/main.ts"></script>');
  await writeFile(resolve(root, 'main.ts'), [
    "import { createApp } from '@gluonjs/core';",
    "import { createStoreManager } from '@gluonjs/store';",
    "import { counterDefinition, Status } from './component.ts';",
    "import './component.ts';",
    'const environment = window as Window & { __gluonLoads?: number };',
    'environment.__gluonLoads = (environment.__gluonLoads ?? 0) + 1;',
    'const manager = createStoreManager();',
    'const element = document.createElement(\'gluon-hmr-counter\') as HTMLElement & { store: unknown };',
    'const store = counterDefinition.use(manager);',
    'element.store = store;',
    'document.querySelector(\'#app\')!.append(element);',
    'createApp(() => Status(store)).mount(document.querySelector(\'#functional\')!);',
  ].join('\n'));
  await writeFile(resolve(root, 'component.ts'), componentSource(version, increment, color));
  return root;
}

async function createPrimitiveFixture(): Promise<string> {
  const root = await mkdtemp(resolve(repositoryRoot, '.tmp-gluon-vite-'));
  temporaryDirectories.push(root);
  await writeFile(
    resolve(root, 'index.html'),
    '<script type="module" src="/main.ts"></script>',
  );
  await writeFile(resolve(root, 'main.ts'), [
    "import { defineElement, GluonElement, html } from '@gluonjs/core';",
    'class CompiledLabel extends GluonElement {',
    "  static override readonly properties = { label: { type: String, default: 'A' } } as const;",
    '  declare label: string;',
    '  protected override render() { return html`<output>${this.label}</output>`; }',
    '}',
    "defineElement('compiled-label', CompiledLabel);",
    "document.body.append(document.createElement('compiled-label'), document.createElement('compiled-label'));",
  ].join('\n'));
  return root;
}

function componentSource(version: string, increment: number, color: string): string {
  return [
    "import { compose, css, GluonElement, html, type TemplateValue } from '@gluonjs/core';",
    "import { customElement, property } from '@gluonjs/core/decorators';",
    "import { defineStore, type Store } from '@gluonjs/store';",
    'export const counterDefinition = defineStore({',
    "  id: 'vite-counter',",
    '  state: () => ({ count: 0 }),',
    `  actions: (store) => ({ increment() { store.count += ${increment}; } }),`,
    '});',
    `const counterStyles = css\`button { color: ${color}; }\`;`,
    'type CounterStore = Store<\'vite-counter\', { count: number }, Record<never, never>, { increment(): void }>; ',
    'function StatusPanel(props: { children: TemplateValue }) { return html`<output>${props.children}</output>`; }',
    `export function Status(store: CounterStore) { return compose(StatusPanel, {})\`Function ${version}: \${store.count}\`; }`,
    "@customElement('gluon-hmr-counter')",
    'export class HmrCounter extends GluonElement {',
    '  static override readonly styles = counterStyles;',
    '  @property({ attribute: false }) store!: CounterStore;',
    '  protected override render() {',
    `    return html\`<button @click=\${() => this.store.increment()}>Version ${version}: \${this.store.count}</button>\`;`,
    '  }',
    '}',
  ].join('\n');
}

function viteConfig(root: string) {
  return {
    root,
    logLevel: 'silent' as const,
    plugins: [gluon()],
    resolve: {
      alias: {
        '@gluonjs/core/decorators': resolve(repositoryRoot, 'src/decorators.ts'),
        '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
        '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
        '@gluonjs/store': resolve(repositoryRoot, 'packages/store/src/index.ts'),
      },
    },
    server: { host: '127.0.0.1', port: 0 },
  };
}
