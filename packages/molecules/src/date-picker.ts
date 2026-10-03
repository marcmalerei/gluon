import { DateInput, type DateInputProps } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { datePickerStyleDependency } from './date-picker-styles.js';

export type DatePickerAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type DatePickerInputAttributes = NonNullable<DateInputProps['attributes']>;

export interface DatePickerProps {
  readonly id: string;
  readonly label: string;
  readonly value?: string;
  readonly min?: string;
  readonly max?: string;
  readonly step?: string;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly onInput?: (value: string, event: InputEvent) => void;
  readonly inputAttributes?: DatePickerInputAttributes;
  readonly attributes?: DatePickerAttributes;
}

function renderDatePicker({
  id,
  label,
  value,
  min,
  max,
  step,
  name,
  disabled = false,
  required = false,
  helper,
  error,
  onInput,
  inputAttributes = {},
  attributes = {},
}: DatePickerProps): TemplateResult {
  assertDomId('DatePicker.id', id);
  assertNonEmpty('DatePicker.label', label);
  const inputId = inputAttributes.id ?? `${id}-input`;
  assertDomId('DatePicker.inputAttributes.id', inputId);
  const labelId = `${id}-label`;
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const { aria, onInput: attributeInput, ...nativeInputAttributes } = inputAttributes;
  const describedBy = [aria?.describedby, errorId ?? helperId].filter(Boolean).join(' ') || undefined;

  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-date-picker': true }, attributes.class],
    children: [
      q.label({ id: labelId, for: inputId, class: 'gluon-date-picker-label', children: label }),
      DateInput({
        value,
        name,
        disabled,
        invalid: error !== undefined,
        onInput: (event) => {
          callListener(attributeInput, event);
          if (!event.defaultPrevented) onInput?.((event.target as HTMLInputElement).value, event);
        },
        attributes: {
          ...nativeInputAttributes,
          id: inputId,
          min,
          max,
          step,
          required,
          aria: { ...aria, labelledby: labelId, describedby: describedBy },
        },
      }),
      error === undefined && helper === undefined
        ? nothing
        : q.span({
            id: error === undefined ? helperId : errorId,
            class: error === undefined ? 'gluon-date-picker-helper' : 'gluon-date-picker-error',
            role: error === undefined ? undefined : 'alert',
            children: error ?? helper,
          }),
    ],
  });
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}

function callListener<EventType extends Event>(
  listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined,
  event: EventType,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const DatePicker = defineMolecule(renderDatePicker, 'DatePicker', [datePickerStyleDependency]);
