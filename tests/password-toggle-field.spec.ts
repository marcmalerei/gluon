import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import axe from 'axe-core';
import { PasswordToggleField, passwordToggleFieldStyles } from '@gluonjs/molecules';
import { adoptStyles, createComponentStyleSelection, html, render, unmount } from '../src/index.js';
import { createStyleManifest, prepareForHydration, renderStyleCarriers } from '@gluonjs/ssr';
import { hydrateTemplate } from '@gluonjs/ssr/hydration';

beforeEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('PasswordToggleField', () => {
  it('keeps one native input and one non-submitting controlled toggle', async () => {
    let visible = false;
    const form = document.createElement('form');
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault());
    form.addEventListener('submit', submit);
    document.body.append(form);
    const onVisibleChange = vi.fn((next: boolean) => {
      visible = next;
      render(view(), form);
    });
    const view = () => PasswordToggleField({
      id: 'account-password',
      label: 'Passwort',
      value: 'secret-value',
      visible,
      onVisibleChange,
      name: 'password',
      autocomplete: 'current-password',
      showLabel: 'Passwort anzeigen',
      hideLabel: 'Passwort verbergen',
      helper: 'Mindestens ein Zeichen.',
    });
    render(view(), form);

    const input = document.querySelector<HTMLInputElement>('#account-password-input')!;
    const toggle = document.querySelector<HTMLButtonElement>('[aria-controls="account-password-input"]')!;
    expect(document.querySelectorAll('input')).toHaveLength(1);
    expect(document.querySelectorAll('button')).toHaveLength(1);
    expect(input.type).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
    expect(new FormData(form).get('password')).toBe('secret-value');
    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    input.focus();
    input.setSelectionRange(2, 5);
    const selection = [input.selectionStart, input.selectionEnd];

    render(view(), form);
    expect(document.querySelector<HTMLInputElement>('#account-password-input')).toBe(input);
    expect(document.activeElement).toBe(input);

    toggle.click();
    const updated = document.querySelector<HTMLInputElement>('#account-password-input')!;
    expect(onVisibleChange).toHaveBeenCalledOnce();
    expect(updated).toBe(input);
    expect(updated.type).toBe('text');
    expect(updated.value).toBe('secret-value');
    expect(new FormData(form).get('password')).toBe('secret-value');
    expect([updated.selectionStart, updated.selectionEnd]).toEqual(selection);
    expect(document.querySelector<HTMLButtonElement>('[aria-controls="account-password-input"]')?.textContent).toBe('Passwort verbergen');
    expect(submit).not.toHaveBeenCalled();
  });

  it('preserves native validation relationships and does not announce the value', async () => {
    render(PasswordToggleField({
      id: 'invalid-password',
      label: 'Password',
      value: 'hidden-secret',
      showLabel: 'Show password',
      hideLabel: 'Hide password',
      required: true,
      readOnly: true,
      invalid: true,
      helper: 'Use your existing password.',
      error: 'Password is invalid.',
    }), document.body);
    const input = document.querySelector<HTMLInputElement>('#invalid-password-input')!;
    const root = document.querySelector('#invalid-password')!;
    expect(input.required).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('invalid-password-helper');
    expect(input.getAttribute('aria-errormessage')).toBe('invalid-password-error');
    expect(root.querySelectorAll('[aria-live], [role="status"]').length).toBe(0);
    expect(root.textContent).not.toContain('hidden-secret');
    expect(input.id).toBe('invalid-password-input');
  });

  it('supports duplicate-safe namespaces, responsive constraints, and the owned stylesheet', async () => {
    adoptStyles(document, passwordToggleFieldStyles);
    render(html`<main><div data-testid="fields" style="box-sizing:border-box;inline-size:320px;max-inline-size:100%">${PasswordToggleField({ id: 'first-password', label: 'First', showLabel: 'Show', hideLabel: 'Hide' })}${PasswordToggleField({ id: 'second-password', label: 'Second', showLabel: 'Show', hideLabel: 'Hide' })}</div></main>`, document.body);
    expect(document.querySelectorAll('input')).toHaveLength(2);
    expect(document.querySelector('#first-password-label')?.getAttribute('for')).toBe('first-password-input');
    expect(document.querySelector('#second-password-label')?.getAttribute('for')).toBe('second-password-input');
    expect(document.adoptedStyleSheets).toContain(passwordToggleFieldStyles);

    const fieldRect = document.querySelector<HTMLElement>('[data-testid="fields"]')!.getBoundingClientRect();
    expect(fieldRect.width).toBeLessThanOrEqual(320);
    expect((await axe.run(document.body)).violations).toEqual([]);
  });

  it('matches the responsive password field visual baseline', async () => {
    adoptStyles(document, passwordToggleFieldStyles);
    render(html`<main><div data-testid="password-visual" style="box-sizing:border-box;inline-size:320px;max-inline-size:100%;padding:16px">${PasswordToggleField({ id: 'visual-password', label: 'Password', value: 'example-password', showLabel: 'Show password', hideLabel: 'Hide password', helper: 'Use a password manager when available.' })}</div></main>`, document.body);
    await expect.element(page.getByTestId('password-visual')).toMatchScreenshot('password-toggle-field-states', {
      comparatorName: 'pixelmatch',
      comparatorOptions: { allowedMismatchedPixelRatio: 0.05, threshold: 0.15 },
    });
  });

  it('renders deterministic SSR and retains the input and toggle during hydration', async () => {
    const value = PasswordToggleField({
      id: 'hydrated-password',
      label: 'Password',
      value: 'server-secret',
      visible: true,
      showLabel: 'Show password',
      hideLabel: 'Hide password',
      helper: 'Use your existing password.',
    });
    const prepared = await prepareForHydration(value);
    const host = document.createElement('section');
    const styleRoot = host.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    const manifest = createStyleManifest(createComponentStyleSelection(prepared.value));
    styleRoot.innerHTML = renderStyleCarriers(manifest);
    styleRoot.append(root);
    const input = root.querySelector<HTMLInputElement>('#hydrated-password-input')!;
    const toggle = root.querySelector<HTMLButtonElement>('[aria-controls="hydrated-password-input"]')!;
    const result = await hydrateTemplate(value, root, { styleRoot, styles: manifest });
    expect(result.retained).toBe(true);
    expect(root.querySelector('#hydrated-password-input')).toBe(input);
    expect(root.querySelector('[aria-controls="hydrated-password-input"]')).toBe(toggle);
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(styleRoot.adoptedStyleSheets).toContain(passwordToggleFieldStyles);
  });

  it('validates labels and composes consumer input and toggle listeners', () => {
    expect(() => PasswordToggleField({ id: '', label: 'Password', showLabel: 'Show', hideLabel: 'Hide' })).toThrow(/non-empty/u);
    expect(() => PasswordToggleField({ id: 'two words', label: 'Password', showLabel: 'Show', hideLabel: 'Hide' })).toThrow(/whitespace/u);
    expect(() => PasswordToggleField({ id: 'empty-label', label: ' ', showLabel: 'Show', hideLabel: 'Hide' })).toThrow(/non-empty/u);
    expect(() => PasswordToggleField({ id: 'empty-show', label: 'Password', showLabel: ' ', hideLabel: 'Hide' })).toThrow(/non-empty/u);
    expect(() => PasswordToggleField({ id: 'empty-hide', label: 'Password', showLabel: 'Show', hideLabel: ' ' })).toThrow(/non-empty/u);

    const attributeInput = vi.fn();
    const consumerInput = vi.fn();
    const visibleChange = vi.fn();
    render(PasswordToggleField({
      id: 'listener-password',
      label: 'Password',
      showLabel: 'Show',
      hideLabel: 'Hide',
      onInput: consumerInput,
      onVisibleChange: visibleChange,
      inputAttributes: { onInput: attributeInput },
      toggleAttributes: { onClick: (event) => event.preventDefault() },
    }), document.body);
    const input = document.querySelector<HTMLInputElement>('#listener-password-input')!;
    input.value = 'typed';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'typed' }));
    expect(attributeInput).toHaveBeenCalledOnce();
    expect(consumerInput).toHaveBeenCalledOnce();
    expect(document.querySelector<HTMLButtonElement>('[aria-controls="listener-password-input"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false);
    expect(visibleChange).not.toHaveBeenCalled();
  });
});
