import { defineMolecule, nothing, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { oneTimePasswordFieldStyleDependency } from './one-time-password-field-styles.js';

export type OneTimePasswordFieldMode = 'numeric' | 'alphanumeric';
export type OneTimePasswordFieldAttributes = Omit<QuarkProps<HTMLFieldSetElement>, 'children' | 'id' | '.id' | 'disabled' | '.disabled' | '?disabled' | 'aria'> & { readonly aria?: Omit<NonNullable<QuarkProps<HTMLFieldSetElement>['aria']>, 'describedby' | 'errormessage' | 'invalid'>; };
export type OneTimePasswordFieldInputAttributes = Omit<QuarkProps<HTMLInputElement>, 'children' | 'id' | '.id' | 'name' | '.name' | 'type' | '.type' | 'value' | '.value' | 'maxlength' | '.maxLength' | 'disabled' | '.disabled' | '?disabled' | 'readonly' | 'readOnly' | '.readOnly' | '?readonly' | 'required' | '.required' | '?required' | 'autocomplete' | 'inputmode' | 'aria' | 'onInput' | 'onKeydown'> & { readonly aria?: Omit<NonNullable<QuarkProps<HTMLInputElement>['aria']>, 'invalid' | 'label' | 'describedby' | 'errormessage'>; };

export interface OneTimePasswordFieldProps {
  readonly id: string;
  readonly label: string;
  readonly length?: number;
  readonly mode?: OneTimePasswordFieldMode;
  readonly value?: string;
  readonly name?: string;
  readonly helper?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly onValueChange?: (value: string, event: InputEvent | ClipboardEvent | KeyboardEvent | CompositionEvent) => void;
  readonly inputAttributes?: OneTimePasswordFieldInputAttributes;
  readonly attributes?: OneTimePasswordFieldAttributes;
}

function renderOneTimePasswordField({ id, label, length = 6, mode = 'numeric', value = '', name, helper, error, disabled = false, readOnly = false, required = false, invalid = false, onValueChange, inputAttributes = {}, attributes = {} }: OneTimePasswordFieldProps): TemplateResult {
  assertDomId('OneTimePasswordField.id', id);
  assertNonEmpty('OneTimePasswordField.label', label);
  assertLength(length);
  if (!['numeric', 'alphanumeric'].includes(mode)) throw new TypeError(`OneTimePasswordField.mode must be numeric or alphanumeric; received ${String(mode)}.`);
  if (name !== undefined) assertNonEmpty('OneTimePasswordField.name', name);
  const normalized = normalizeValue(value, length, mode);
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const effectiveInvalid = invalid || error !== undefined;
  const { aria, ...nativeAttributes } = attributes;
  const { aria: inputAria, ...nativeInputAttributes } = inputAttributes;
  let composing = false;
  const fieldsFor = (target: HTMLInputElement): HTMLInputElement[] => [...target.closest('fieldset')?.querySelectorAll<HTMLInputElement>('.gluon-one-time-password-field-input') ?? []];
  const emit = (target: HTMLInputElement, next: string, event: InputEvent | ClipboardEvent | KeyboardEvent | CompositionEvent): void => {
    const fields = fieldsFor(target);
    const index = Math.max(0, fields.indexOf(target));
    const values = fields.map((field) => field.value);
    values[index] = next;
    const nextValue = normalizeValue(values.join(''), length, mode);
    syncNativeValue(target, nextValue);
    onValueChange?.(nextValue, event);
  };
  const setFields = (target: HTMLInputElement, start: number, text: string, event: ClipboardEvent): void => {
    const fields = fieldsFor(target);
    const chars = normalizeValue(text, length, mode).slice(0, length - start).split('');
    for (let index = start; index < start + chars.length; index += 1) fields[index]!.value = chars[index - start] ?? '';
    if (start === 0 && chars.length >= length) for (let index = chars.length; index < fields.length; index += 1) fields[index]!.value = '';
    const nextValue = normalizeValue(fields.map((field) => field.value).join(''), length, mode);
    syncNativeValue(target, nextValue);
    onValueChange?.(nextValue, event);
    fields[Math.min(start + Math.max(chars.length - 1, 0), fields.length - 1)]?.focus();
  };
  const handleInput = (event: InputEvent): void => {
    const target = event.currentTarget as HTMLInputElement;
    if (composing) return;
    target.value = normalizeValue(target.value, 1, mode);
    emit(target, target.value, event);
    if (target.value) fieldsFor(target)[fieldsFor(target).indexOf(target) + 1]?.focus();
  };
  const handlePaste = (event: ClipboardEvent): void => {
    if (disabled || readOnly) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLInputElement;
    const text = event.clipboardData?.getData('text') ?? '';
    const clean = normalizeValue(text, length, mode);
    const index = fieldsFor(target).indexOf(target);
    setFields(target, clean.length >= length ? 0 : Math.max(index, 0), text, event);
  };
  const handleKeydown = (event: KeyboardEvent): void => {
    const target = event.currentTarget as HTMLInputElement;
    const fields = fieldsFor(target);
    const index = fields.indexOf(target);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); fields[index + (event.key === 'ArrowLeft' ? -1 : 1)]?.focus(); return; }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); fields[event.key === 'Home' ? 0 : fields.length - 1]?.focus(); return; }
    if (readOnly || disabled) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (target.value) { target.value = ''; emit(target, '', event); }
      else if (event.key === 'Backspace' && fields[index - 1]) { fields[index - 1]!.value = ''; fields[index - 1]!.focus(); emit(fields[index - 1]!, '', event); }
    }
  };
  const handleCompositionStart = (): void => { composing = true; };
  const handleCompositionEnd = (event: CompositionEvent): void => { composing = false; const target = event.currentTarget as HTMLInputElement; target.value = normalizeValue(target.value, 1, mode); emit(target, target.value, event); };
  const fields = Array.from({ length }, (_, index) => q.input({
    ...nativeInputAttributes,
    class: [{ gluon: true, molecule: true, 'gluon-one-time-password-field-input': true }, inputAttributes.class],
    '.value': normalized[index] ?? '', maxlength: 1, autocomplete: 'one-time-code', inputmode: mode === 'numeric' ? 'numeric' : 'text',
    '?disabled': disabled, '?readonly': readOnly, '?required': required && index === 0,
    'aria-label': `${label} ${index + 1} of ${length}`,
    aria: { ...inputAria, describedby: [helperId, errorId].filter(Boolean).join(' ') || undefined, errormessage: errorId, invalid: effectiveInvalid || undefined, readonly: readOnly || undefined, required: required || undefined },
    onInput: handleInput, onKeydown: handleKeydown, '@paste': handlePaste, '@compositionstart': handleCompositionStart, '@compositionend': handleCompositionEnd,
  } as unknown as QuarkProps<HTMLInputElement>));
  function syncNativeValue(target: HTMLInputElement, nextValue: string): void {
    const nativeValue = target.closest('fieldset')?.querySelector<HTMLInputElement>('.gluon-one-time-password-field-native-value');
    if (nativeValue) nativeValue.value = nextValue;
  }
  return q.fieldset({ ...nativeAttributes, id, class: [{ gluon: true, molecule: true, 'gluon-one-time-password-field': true }, attributes.class], '?disabled': disabled, aria: { ...aria, describedby: [helperId, errorId].filter(Boolean).join(' ') || undefined, errormessage: errorId, invalid: effectiveInvalid || undefined }, children: [
    q.legend({ class: 'gluon-one-time-password-field-legend', children: label }),
    q.div({ class: 'gluon-one-time-password-field-inputs', dir: 'auto', children: fields }),
    name === undefined ? nothing : q.input({ class: 'gluon-one-time-password-field-native-value', type: 'text', name, '.value': normalized, '?disabled': disabled, '?required': required, readonly: readOnly, autocomplete: 'one-time-code', inputMode: mode === 'numeric' ? 'numeric' : 'text', 'aria-hidden': 'true', tabIndex: -1 }),
    errorId ? q.span({ id: errorId, class: 'gluon-one-time-password-field-error', role: 'alert', children: error }) : helperId ? q.span({ id: helperId, class: 'gluon-one-time-password-field-helper', children: helper }) : nothing,
  ] });
}

function normalizeValue(value: string, length: number, mode: OneTimePasswordFieldMode): string { return value.replace(mode === 'numeric' ? /[^0-9]/gu : /[^a-z0-9]/giu, '').slice(0, length); }
function assertNonEmpty(name: string, value: string): void { if (value.trim().length === 0) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
function assertLength(length: number): void { if (!Number.isInteger(length) || length < 1 || length > 12) throw new TypeError(`OneTimePasswordField.length must be an integer from 1 through 12; received ${String(length)}.`); }

export const OneTimePasswordField = defineMolecule(renderOneTimePasswordField, 'OneTimePasswordField', [oneTimePasswordFieldStyleDependency]);
