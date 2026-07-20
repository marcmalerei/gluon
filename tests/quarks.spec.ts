import { beforeEach, describe, expect, it, vi } from 'vitest';
import { css, render } from '../src/index.js';
import { createComponentLibraryLoader, fragment, htmlTagNames, q, quark, validateComponentLibraryManifest } from '@gluonjs/quarks';

describe('quarks', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('provides a cached typed factory for every documented HTML tag', () => {
    expect(new Set(htmlTagNames).size).toBe(htmlTagNames.length);
    for (const tagName of htmlTagNames) {
      expect(q[tagName].tagName).toBe(tagName);
      expect(q[tagName].layer).toBe('quark');
      expect(q[tagName]).toBe(q[tagName]);
    }
    expect((q as unknown as { then?: unknown }).then).toBeUndefined();
  });

  it('renders element props through first-class spreading', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    render(q.button({
      id: 'save',
      class: { action: true },
      '?disabled': false,
      data: { testId: 'save' },
      aria: { label: 'Save changes' },
      onClick: click,
      children: 'Save',
    }), root);

    const button = root.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(button.classList.contains('gluon')).toBe(true);
    expect(button.classList.contains('quark')).toBe(true);
    expect(button.classList.contains('action')).toBe(true);
    expect(button.dataset.testId).toBe('save');
    expect(button.getAttribute('aria-label')).toBe('Save changes');
    expect(click).toHaveBeenCalledOnce();
  });

  it('supports custom-element quarks and fragment composition', () => {
    const root = document.createElement('div');
    const custom = quark('demo-panel');

    render(fragment([
      q.span({ children: 'before' }),
      custom({ children: q.strong({ children: 'inside' }) }),
    ]), root);

    expect(root.innerHTML).toContain('<demo-panel');
    expect(root.querySelector('demo-panel strong')?.textContent).toBe('inside');
  });

  it('rejects children for void elements', () => {
    expect(() => q.input({ children: 'invalid' })).toThrow(/cannot receive children/i);
  });

  it('validates a serializable public component-library manifest without importing it', () => {
    const result = validateComponentLibraryManifest({
      schemaVersion: 1,
      name: '@acme/shop-components',
      entries: [{
        id: 'product-configurator',
        module: '@acme/shop-components/product-configurator',
        exportName: 'ProductConfigurator',
        layer: 'element',
        tag: 'acme-product-configurator',
        styles: ['acme-product-configurator'],
        dependencies: ['purchase-action'],
        accessibility: 'Uses labelled native choices.',
      }],
    });

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('rejects unsafe module targets and duplicate element registration names in a manifest', () => {
    const result = validateComponentLibraryManifest({
      schemaVersion: 1,
      name: 'example',
      entries: [
        { id: 'one', module: './private', exportName: 'One', layer: 'element', tag: 'acme-panel', styles: [], dependencies: [], accessibility: 'A.' },
        { id: 'one', module: '@acme/library/two', exportName: 'Two', layer: 'element', tag: 'acme-panel', styles: [], dependencies: [], accessibility: 'B.' },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Entry 0 module must be a bare public ESM specifier.',
      'Entry 1 duplicates id one.',
      'Entry 1 duplicates tag acme-panel.',
    ]));
  });

  it('reports malformed manifests and each invalid entry boundary without importing modules', () => {
    expect(validateComponentLibraryManifest(null)).toEqual({
      valid: false,
      errors: ['Manifest must be an object.'],
    });
    expect(validateComponentLibraryManifest({ schemaVersion: 2, name: '', entries: null }).errors).toEqual([
      'Manifest schemaVersion must be 1.',
      'Manifest name must be a non-empty string.',
      'Manifest entries must be an array.',
    ]);

    const result = validateComponentLibraryManifest({
      schemaVersion: 1,
      name: 'example',
      entries: [null, {
        id: 'Invalid_Key', module: 'https://untrusted.invalid/component', exportName: 'not an export', layer: 'unknown',
        tag: 'not-an-element', styles: [''], dependencies: [''], accessibility: '',
      }, {
        id: 'functional', module: '@acme/library/functional', exportName: 'Functional', layer: 'atom',
        tag: 'acme-not-allowed', styles: [], dependencies: [], accessibility: 'A.',
      }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Entry 0 must be an object.',
      'Entry 1 id must be a kebab-case string.',
      'Entry 1 module must be a bare public ESM specifier.',
      'Entry 1 exportName must be an identifier.',
      'Entry 1 layer is invalid.',
      'Entry 1 styles must be non-empty string ids.',
      'Entry 1 dependencies must be string ids.',
      'Entry 1 accessibility must be a non-empty string.',
      'Entry 1 only an element may declare tag.',
      'Entry 2 only an element may declare tag.',
    ]));
  });

  it('loads only the requested public entry and its declared dependencies with observable cache state', async () => {
    const load = vi.fn(async (entry: { id: string }) => ({ id: entry.id }));
    const loader = createComponentLibraryLoader({ schemaVersion: 1, name: 'example', entries: [
      { id: 'base', module: '@acme/components/base', exportName: 'Base', layer: 'atom', styles: [], dependencies: [], accessibility: 'Base.' },
      { id: 'picker', module: '@acme/components/picker', exportName: 'Picker', layer: 'molecule', styles: [], dependencies: ['base'], accessibility: 'Picker.' },
    ] }, { load });

    expect(loader.status('picker')).toBe('idle');
    const first = loader.load('picker');
    expect(loader.status('picker')).toBe('loading');
    expect(await first).toMatchObject({ entry: { id: 'picker' }, value: { id: 'picker' } });
    expect(loader.status('picker')).toBe('loaded');
    await loader.load('picker');
    expect(load.mock.calls.map(([entry]) => entry.id)).toEqual(['base', 'picker']);
    expect(() => loader.load('missing')).toThrow('Unknown component-library entry: missing.');
  });

  it('reports failed, cyclic, and conflicting element loads without retaining a bad cache entry', async () => {
    const failed = createComponentLibraryLoader({ schemaVersion: 1, name: 'example', entries: [
      { id: 'broken', module: '@acme/components/broken', exportName: 'Broken', layer: 'atom', styles: [], dependencies: [], accessibility: 'Broken.' },
    ] }, { load: async () => { throw new Error('network failure'); } });
    await expect(failed.load('broken')).rejects.toThrow('network failure');
    await Promise.resolve();
    expect(failed.status('broken')).toBe('failed');

    const cyclic = createComponentLibraryLoader({ schemaVersion: 1, name: 'example', entries: [
      { id: 'first', module: '@acme/components/first', exportName: 'First', layer: 'atom', styles: [], dependencies: ['second'], accessibility: 'First.' },
      { id: 'second', module: '@acme/components/second', exportName: 'Second', layer: 'atom', styles: [], dependencies: ['first'], accessibility: 'Second.' },
    ] }, { load: async () => null });
    await expect(cyclic.load('first')).rejects.toThrow('Component dependency cycle includes first.');

    const tag: `${string}-${string}` = `acme-loader-${Math.random().toString(36).slice(2)}`;
    class RegisteredElement extends HTMLElement {}
    class DifferentElement extends HTMLElement {}
    customElements.define(tag, RegisteredElement);
    const elements = createComponentLibraryLoader({ schemaVersion: 1, name: 'example', entries: [
      { id: 'element', module: '@acme/components/element', exportName: 'Element', layer: 'element', tag, styles: [], dependencies: [], accessibility: 'Element.' },
    ] }, { load: async () => DifferentElement });
    await expect(elements.load('element')).rejects.toThrow(`Duplicate custom-element registration for ${tag}.`);
  });

  it('retains and releases only the requested component-library sheets', async () => {
    const sheet = css`:host { display: block; }`;
    const target = document.createElement('div').attachShadow({ mode: 'open' });
    const loader = createComponentLibraryLoader({ schemaVersion: 1, name: 'example', entries: [
      { id: 'styled', module: '@acme/components/styled', exportName: 'Styled', layer: 'atom', styles: ['styled'], dependencies: [], accessibility: 'Styled.' },
    ] }, { load: async () => null }, { styleTarget: target, styles: { resolve: () => [sheet] } });

    await loader.load('styled');
    expect(target.adoptedStyleSheets).toContain(sheet);
    loader.release('styled');
    expect(target.adoptedStyleSheets).not.toContain(sheet);
  });
});
