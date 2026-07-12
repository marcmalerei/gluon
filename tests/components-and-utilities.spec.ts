import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adoptStyles,
  Suspense,
  createStyleSheet,
  css,
  compose,
  defineAtom,
  elementRef,
  html,
  installGluonStyles,
  mergeProps,
  model,
  repeat,
  render,
} from '../src/index.js';
import { ref } from '@gluonjs/reactivity';
import { Button, Icon } from '@gluonjs/atoms';
import { Card, FormField } from '@gluonjs/molecules';
import { AppShell } from '@gluonjs/organisms';
import { fragment, q, quark } from '@gluonjs/quarks';

describe('component variants and utilities', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.adoptedStyleSheets = [];
    vi.unstubAllGlobals();
  });

  it('merges class aliases and object styles while preserving scalar overrides', () => {
    expect(mergeProps({
      className: 'base',
      style: { color: 'red', padding: '4px' },
    }, {
      class: { active: true },
      style: { color: 'blue' },
    })).toEqual({
      class: ['base', { active: true }],
      style: { color: 'blue', padding: '4px' },
    });

    expect(mergeProps({ class: 'base', style: { color: 'red' } })).toEqual({
      class: ['base', undefined],
      style: { color: 'red' },
    });
    expect(mergeProps({ style: { color: 'red' } }, { style: 'display: block' }).style)
      .toBe('display: block');
  });

  it('installs interpolated constructable stylesheets and reports unsupported targets', () => {
    const sheet = css`:root { --space: ${4}px; }`;
    expect(sheet.cssRules[0]?.cssText).toContain('--space: 4px');

    const uninstall = installGluonStyles();
    expect(document.adoptedStyleSheets).toHaveLength(2);
    uninstall();
    expect(document.adoptedStyleSheets).toHaveLength(0);

    expect(() => adoptStyles({} as ShadowRoot, sheet)).toThrow(/adoptedStyleSheets support/i);

    vi.stubGlobal('CSSStyleSheet', undefined);
    expect(() => createStyleSheet(':root {}')).toThrow(/constructable CSSStyleSheet support/i);
  });

  it('renders icon, component, and optional composition variants', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    const unnamed = defineAtom(() => html`<span>anonymous</span>`);

    render(fragment([
      Icon({ name: 'trend-up', size: 16, label: 'Rising' }),
      Icon({ name: 'trend-down' }),
      Icon({ name: 'alert', label: 'Alert' }),
      Button({
        children: q.strong({ children: 'Continue' }),
        label: 'Ignored',
        variant: 'secondary',
        size: 'large',
        disabled: true,
        onClick: click,
        attributes: { class: 'custom-button' },
      }),
      Card({}),
      Card({
        subtitle: 'Details',
        tone: 'warning',
        actions: false,
        media: q.img({ alt: 'Preview', src: 'preview.png' }),
        children: 0,
      }),
      FormField({ label: 'Name' }),
      AppShell({ children: q.p({ children: 'Content' }) }),
      unnamed({}),
    ]), root);

    const icons = [...root.querySelectorAll('.gluon-icon')];
    expect(icons).toHaveLength(3);
    expect(icons[0]?.getAttribute('width')).toBe('16');
    expect(icons[0]?.getAttribute('role')).toBe('img');
    expect(icons[1]?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.custom-button strong')?.textContent).toBe('Continue');
    expect((root.querySelector('.gluon-button') as HTMLButtonElement).disabled).toBe(true);
    expect(root.querySelector('.is-warning')).not.toBeNull();
    expect(root.querySelector('.gluon-card-media img')).not.toBeNull();
    expect(root.querySelector('.gluon-card-body')?.textContent).toBe('0');
    expect(root.querySelector('.gluon-form-helper')).toBeNull();
    expect(root.querySelector('.gluon-app-shell-header')).toBeNull();
    expect(root.querySelector('.gluon-app-shell-navigation')).toBeNull();
    expect(root.querySelector('.gluon-app-shell-footer')).toBeNull();
    expect(unnamed.displayName).toBe('AnonymousComponent');
  });

  it('composes typed functional components with an HTML template body and no host boundary', () => {
    const root = document.createElement('div');
    const direct = AppShell({
      header: 'GLUON GOODS',
      children: Card({ title: 'Checkout', children: html`<button>Pay</button>` }),
    });
    const composed = compose(AppShell, { header: 'GLUON GOODS' })`${compose(Card, { title: 'Checkout' })`<button>Pay</button>`}`;

    render(html`<section id="direct">${direct}</section><section id="composed">${composed}</section>`, root);

    expect(root.querySelector('#composed')?.textContent).toBe(root.querySelector('#direct')?.textContent);
    expect(root.querySelector('#composed')?.querySelectorAll('.gluon-app-shell')).toHaveLength(1);
    expect(root.querySelector('#composed')?.querySelectorAll('.gluon-card')).toHaveLength(1);
  });

  it('keeps named/scoped content, callbacks, spreads, models, refs, conditions, keys, and async bodies on public contracts', async () => {
    const input = ref('Ada');
    const inputRef = elementRef<HTMLInputElement>();
    const save = vi.fn();
    const Panel = (props: {
      readonly actions: import('../src/index.js').TemplateValue;
      readonly row: import('../src/index.js').ScopedSlot<{ label: string }>;
      readonly children: import('../src/index.js').TemplateValue;
    }) => html`<section>${props.children}${props.row({ label: 'Scoped' })}${props.actions}</section>`;
    const view = compose(Panel, {
      actions: html`<button @click=${save}>Save</button>`,
      row: ({ label }) => html`<strong>${label}</strong>`,
    })`
      <input ...=${{ ...model(input), ref: inputRef }}>
      ${true ? html`<span>Conditional</span>` : null}
      ${repeat([{ id: 'one', label: 'Keyed' }], (item) => item.id, (item) => html`<i>${item.label}</i>`)}
      ${Suspense({ source: Promise.resolve('Async'), fallback: 'Loading', children: (value) => html`<em>${value}</em>` })}
    `;
    const root = document.createElement('div');
    render(html`${view}`, root);
    expect(inputRef.value?.value).toBe('Ada');
    expect(root.textContent).toContain('Conditional');
    expect(root.textContent).toContain('Keyed');
    expect(root.textContent).toContain('ScopedSave');
    root.querySelector<HTMLButtonElement>('button')?.click();
    expect(save).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(root.querySelector('em')?.textContent).toBe('Async'));
  });

  it('validates quark names and caches fragment templates', () => {
    const root = document.createElement('div');

    expect(() => quark('Invalid Tag')).toThrow(/invalid quark tag name/i);
    render(fragment('first'), root);
    const text = root.firstChild;
    render(fragment('second'), root);
    expect(root.firstChild).toBe(text);
    expect(root.textContent).toBe('second');
    expect((q as unknown as { toJSON?: unknown }).toJSON).toBeUndefined();
  });
});
