import { TimeInput, type TimeInputProps } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { timePickerStyleDependency } from './time-picker-styles.js';

export type TimePickerAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type TimePickerInputAttributes = NonNullable<TimeInputProps['attributes']>;

export interface TimePickerProps {
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
  readonly inputAttributes?: TimePickerInputAttributes;
  readonly attributes?: TimePickerAttributes;
}

function renderTimePicker({
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
}: TimePickerProps): TemplateResult {
  assertDomId('TimePicker.id', id);
  assertNonEmpty('TimePicker.label', label);
  const inputId = inputAttributes.id ?? `${id}-input`;
  assertDomId('TimePicker.inputAttributes.id', inputId);
  const labelId = `${id}-label`;
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const { aria, onInput: attributeInput, ...nativeInputAttributes } = inputAttributes;
  const describedBy = [aria?.describedby, errorId ?? helperId].filter(Boolean).join(' ') || undefined;

  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-time-picker': true }, attributes.class],
    children: [
      q.label({ id: labelId, for: inputId, class: 'gluon-time-picker-label', children: label }),
      TimeInput({
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
            class: error === undefined ? 'gluon-time-picker-helper' : 'gluon-time-picker-error',
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

export const TimePicker = defineMolecule(renderTimePicker, 'TimePicker', [timePickerStyleDependency]);
