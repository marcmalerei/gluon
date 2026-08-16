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
    const form = document.createElement('form');
    document.body.append(form);
    render(OneTimePasswordField({
      id: 'checkout-otp', label: 'One-time code', length: 6, value: '12', name: 'code',
      helper: 'Enter the six-digit code.', required: true, onValueChange,
    }), form);
    const fieldset = document.querySelector('fieldset')!;
    const inputs = [...fieldset.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input')];
    expect(inputs).toHaveLength(6);
    expect(inputs.map((input) => input.value)).toEqual(['1', '2', '', '', '', '']);
    expect(inputs.every((input) => input.required)).toBe(true);
    expect(inputs[0]?.getAttribute('autocomplete')).toBe('one-time-code');
    expect(inputs.slice(1).every((input) => input.getAttribute('autocomplete') === 'off')).toBe(true);
    expect(fieldset.querySelectorAll('input[name="code"]')).toHaveLength(1);
    expect(fieldset.querySelector<HTMLInputElement>('input[name="code"]')?.type).toBe('hidden');
    expect(new FormData(form).get('code')).toBe('12');
    expect(form.checkValidity()).toBe(false);
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
    inputs[0]!.value = 'C3D4';
    inputs[0]!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: 'C3D4' }));
    expect(inputs.map((input) => input.value)).toEqual(['C', '3', 'D', '4']);
    expect(onValueChange).toHaveBeenLastCalledWith('C3D4', expect.any(InputEvent));
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

  it('moves by visual direction in RTL and retains both helper and error relationships', async () => {
    render(OneTimePasswordField({
      id: 'otp-rtl', label: 'RTL code', length: 3, value: '123', helper: 'Keep this help.', error: 'Check the code.', attributes: { dir: 'rtl' },
    }), document.body);
    const inputs = [...document.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input')];
    inputs[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(inputs[1]);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(inputs[0]);
    expect(document.querySelector('#otp-rtl-helper')?.textContent).toBe('Keep this help.');
    expect(document.querySelector('#otp-rtl-error')?.textContent).toBe('Check the code.');
    expect(inputs[0]?.getAttribute('aria-describedby')).toBe('otp-rtl-helper otp-rtl-error');
    expect((await axe.run(document.querySelector('fieldset')!)).violations).toEqual([]);
  });

  it('namespaces derived helper and error relationships per deterministic instance id', () => {
    render(html`${OneTimePasswordField({ id: 'otp-first', label: 'First code', helper: 'First help' })}${OneTimePasswordField({ id: 'otp-second', label: 'Second code', error: 'Second error' })}`, document.body);
    expect(document.querySelectorAll('#otp-first-helper')).toHaveLength(1);
    expect(document.querySelectorAll('#otp-second-error')).toHaveLength(1);
    expect(document.querySelector('#otp-first input')?.getAttribute('aria-describedby')).toBe('otp-first-helper');
    expect(document.querySelector('#otp-second input')?.getAttribute('aria-describedby')).toBe('otp-second-error');
  });

  it('rejects ambiguous public contracts before producing markup', () => {
    expect(() => OneTimePasswordField({ id: '', label: 'Code' })).toThrow(/non-empty/u);
    expect(() => OneTimePasswordField({ id: 'two words', label: 'Code' })).toThrow(/whitespace/u);
    expect(() => OneTimePasswordField({ id: 'otp-label', label: ' ' })).toThrow(/non-empty/u);
    expect(() => OneTimePasswordField({ id: 'otp-name', label: 'Code', name: ' ' })).toThrow(/non-empty/u);
    expect(() => OneTimePasswordField({ id: 'otp-short', label: 'Code', length: 0 })).toThrow(/integer from 1 through 12/u);
    expect(() => OneTimePasswordField({ id: 'otp-fraction', label: 'Code', length: 1.5 })).toThrow(/integer from 1 through 12/u);
    expect(() => OneTimePasswordField({ id: 'otp-long', label: 'Code', length: 13 })).toThrow(/integer from 1 through 12/u);
    expect(() => OneTimePasswordField({ id: 'otp-mode', label: 'Code', mode: 'letters' as 'numeric' })).toThrow(/numeric or alphanumeric/u);
  });

  it('covers native editing boundaries, blocked edits, and multi-character composition', async () => {
    const onValueChange = vi.fn();
    render(OneTimePasswordField({ id: 'otp-boundaries', label: 'Code', length: 4, onValueChange }), document.body);
    const inputs = [...document.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input')];
    inputs[0]!.value = '5';
    inputs[0]!.dispatchEvent(new InputEvent('input', { bubbles: true, data: '5' }));
    expect(document.activeElement).toBe(inputs[1]);
    inputs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    expect(inputs[0]!.value).toBe('');
    inputs[2]!.value = '7';
    inputs[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(inputs[2]!.value).toBe('');
    inputs[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(inputs[0]);
    inputs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(inputs[1]);

    const partialTransfer = new DataTransfer();
    partialTransfer.setData('text/plain', '89');
    const partialPaste = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(partialPaste, 'clipboardData', { configurable: true, value: partialTransfer });
    inputs[1]!.dispatchEvent(partialPaste);
    expect(inputs.map((input) => input.value)).toEqual(['', '8', '9', '']);

    inputs[0]!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    inputs[0]!.value = '123';
    inputs[0]!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    expect(inputs.map((input) => input.value)).toEqual(['1', '2', '3', '']);
    expect(onValueChange).toHaveBeenLastCalledWith('123', expect.any(CompositionEvent));

    document.body.replaceChildren();
    render(OneTimePasswordField({ id: 'otp-blocked', label: 'Blocked', length: 2, value: '12', readOnly: true }), document.body);
    const readOnlyInput = document.querySelector<HTMLInputElement>('.gluon-one-time-password-field-input')!;
    readOnlyInput.value = '9';
    readOnlyInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: '9' }));
    readOnlyInput.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true }));
    readOnlyInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(readOnlyInput.value).toBe('9');

    document.body.replaceChildren();
    render(OneTimePasswordField({ id: 'otp-disabled', label: 'Disabled', length: 2, disabled: true }), document.body);
    const disabledInput = document.querySelector<HTMLInputElement>('.gluon-one-time-password-field-input')!;
    disabledInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: '1' }));
    expect(disabledInput.value).toBe('');
  });
});
