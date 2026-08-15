import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import axe from 'axe-core';
import { OneTimePasswordField, oneTimePasswordFieldStyles } from '@gluonjs/molecules';
import { getStyleSheetText, html, render, unmount } from '../src/index.js';

beforeEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('OneTimePasswordField', () => {
  it('keeps one controlled native form value and accessible relationships', async () => {
    const onValueChange = vi.fn();
    render(OneTimePasswordField({
      id: 'checkout-otp', label: 'One-time code', length: 6, value: '12', name: 'code',
      helper: 'Enter the six-digit code.', required: true, onValueChange,
    }), document.body);
    const fieldset = document.querySelector('fieldset')!;
    const inputs = [...fieldset.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input')];
    expect(inputs).toHaveLength(6);
    expect(inputs.map((input) => input.value)).toEqual(['1', '2', '', '', '', '']);
    expect(fieldset.querySelectorAll('input[name="code"]')).toHaveLength(1);
    expect(new FormData(fieldset.closest('form') ?? (() => { const form = document.createElement('form'); form.append(fieldset.cloneNode(true)); return form; })()).get('code')).toBe('12');
    expect(inputs[0]?.getAttribute('aria-describedby')).toBe('checkout-otp-helper');
    expect(inputs[0]?.getAttribute('aria-label')).toBe('One-time code 1 of 6');
    expect(document.adoptedStyleSheets).toContain(oneTimePasswordFieldStyles);
    expect((await axe.run(fieldset)).violations).toHaveLength(0);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('distributes complete and partial paste, filters mode input, and replaces selection', () => {
    const onValueChange = vi.fn();
    render(OneTimePasswordField({ id: 'otp-edit', label: 'Code', length: 4, mode: 'alphanumeric', name: 'code', onValueChange }), document.body);
    const inputs = [...document.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input')];
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'a-1b2');
    const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { configurable: true, value: transfer });
    inputs[0]!.dispatchEvent(paste);
    expect(inputs.map((input) => input.value)).toEqual(['a', '1', 'b', '2']);
    expect(document.querySelector<HTMLInputElement>('input[name="code"]')?.value).toBe('a1b2');
    expect(onValueChange).toHaveBeenLastCalledWith('a1b2', expect.any(ClipboardEvent));
    inputs[1]!.value = '9';
    inputs[1]!.select();
    inputs[1]!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '9' }));
    expect(onValueChange).toHaveBeenLastCalledWith('a9b2', expect.any(InputEvent));
    expect(document.querySelector<HTMLInputElement>('input[name="code"]')?.value).toBe('a9b2');
  });

  it('supports keyboard movement, deletion, readonly and IME-safe composition', async () => {
    const onValueChange = vi.fn();
    render(OneTimePasswordField({ id: 'otp-keyboard', label: 'Code', length: 3, value: '123', onValueChange }), document.body);
    const inputs = [...document.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input')];
    inputs[1]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(inputs[0]);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(inputs[2]);
    await userEvent.keyboard('{Backspace}');
    expect(inputs[2]!.value).toBe('');
    const composition = inputs[2]!;
    composition.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    composition.value = '3';
    composition.dispatchEvent(new InputEvent('input', { bubbles: true, data: '3' }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    composition.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    expect(onValueChange).toHaveBeenLastCalledWith('123', expect.any(CompositionEvent));
    document.body.replaceChildren();
    render(OneTimePasswordField({ id: 'otp-readonly', label: 'Readonly code', length: 2, value: '12', readOnly: true }), document.body);
    expect([...document.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input')].every((input) => input.readOnly)).toBe(true);
  });

  it('keeps the narrow, RTL, media, and touch contracts explicit', () => {
    render(OneTimePasswordField({ id: 'otp-narrow', label: 'A deliberately long one-time code label', length: 8, mode: 'alphanumeric', attributes: { dir: 'rtl' } }), document.body);
    const fieldset = document.querySelector('fieldset')!;
    expect(getComputedStyle(fieldset).direction).toBe('rtl');
    const cssText = getStyleSheetText(oneTimePasswordFieldStyles);
    expect(cssText).toContain('min-block-size: var(--gluon-one-time-password-field-control-size, 44px)');
    expect(cssText).toContain('@media (forced-colors: active)');
    expect(cssText).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssText).toContain('@media (max-width: 20rem)');
  });

  it('namespaces derived helper and error relationships per deterministic instance id', () => {
    render(html`${OneTimePasswordField({ id: 'otp-first', label: 'First code', helper: 'First help' })}${OneTimePasswordField({ id: 'otp-second', label: 'Second code', error: 'Second error' })}`, document.body);
    expect(document.querySelectorAll('#otp-first-helper')).toHaveLength(1);
    expect(document.querySelectorAll('#otp-second-error')).toHaveLength(1);
    expect(document.querySelector('#otp-first input')?.getAttribute('aria-describedby')).toBe('otp-first-helper');
    expect(document.querySelector('#otp-second input')?.getAttribute('aria-describedby')).toBe('otp-second-error');
  });
});
