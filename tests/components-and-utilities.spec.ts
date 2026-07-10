import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adoptStyles,
  createStyleSheet,
  css,
  defineAtom,
  html,
  installGluonStyles,
  mergeProps,
  render,
} from '../src/index.js';
import { Button, Icon } from '../src/atoms/index.js';
import { Card, FormField } from '../src/molecules/index.js';
import { AppShell } from '../src/organisms/index.js';
import { fragment, q, quark } from '../src/quarks/index.js';

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
