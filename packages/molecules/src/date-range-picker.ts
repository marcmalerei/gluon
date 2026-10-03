import { DateInput, type DateInputProps } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { dateRangePickerStyleDependency } from './date-range-picker-styles.js';

export type DateRangePickerAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type DateRangePickerInputAttributes = NonNullable<DateInputProps['attributes']>;

export interface DateRangeValue {
  readonly start: string;
  readonly end: string;
}

export type DateRangePickerField = 'start' | 'end';

export interface DateRangePickerProps {
  readonly id: string;
  readonly label: string;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly startValue?: string;
  readonly endValue?: string;
  readonly min?: string;
  readonly max?: string;
  readonly step?: string;
  readonly startName?: string;
  readonly endName?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly rangeError?: string;
  readonly onInput?: (value: DateRangeValue, field: DateRangePickerField, event: InputEvent) => void;
  readonly startInputAttributes?: DateRangePickerInputAttributes;
  readonly endInputAttributes?: DateRangePickerInputAttributes;
  readonly attributes?: DateRangePickerAttributes;
}

function renderDateRangePicker({
  id,
  label,
  startLabel = 'Start date',
  endLabel = 'End date',
  startValue = '',
  endValue = '',
  min,
  max,
  step,
  startName,
  endName,
  disabled = false,
  required = false,
  helper,
  error,
  rangeError = 'The start date must be on or before the end date.',
  onInput,
  startInputAttributes = {},
  endInputAttributes = {},
  attributes = {},
}: DateRangePickerProps): TemplateResult {
  assertDomId('DateRangePicker.id', id);
  assertNonEmpty('DateRangePicker.label', label);
  assertNonEmpty('DateRangePicker.startLabel', startLabel);
  assertNonEmpty('DateRangePicker.endLabel', endLabel);
  const startId = startInputAttributes.id ?? `${id}-start`;
  const endId = endInputAttributes.id ?? `${id}-end`;
  assertDomId('DateRangePicker.startInputAttributes.id', startId);
  assertDomId('DateRangePicker.endInputAttributes.id', endId);
  const labelId = `${id}-label`;
  const startLabelId = `${id}-start-label`;
  const endLabelId = `${id}-end-label`;
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const rangeInvalid = Boolean(startValue && endValue && startValue > endValue);
  const message = error ?? (rangeInvalid ? rangeError : undefined);
  const messageId = message === undefined ? undefined : `${id}-error`;
  const describedBy = [startInputAttributes.aria?.describedby, endInputAttributes.aria?.describedby, messageId ?? helperId].filter(Boolean).join(' ') || undefined;
  const getValue = (field: DateRangePickerField, event: InputEvent): DateRangeValue => ({
    start: field === 'start' ? (event.target as HTMLInputElement).value : startValue,
    end: field === 'end' ? (event.target as HTMLInputElement).value : endValue,
  });
  const startAria = startInputAttributes.aria;
  const endAria = endInputAttributes.aria;
  const { aria: _startAria, onInput: startAttributeInput, ...startNativeAttributes } = startInputAttributes;
  const { aria: _endAria, onInput: endAttributeInput, ...endNativeAttributes } = endInputAttributes;

  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-date-range-picker': true }, attributes.class],
    children: [
      q.span({ id: labelId, class: 'gluon-date-range-picker-label', children: label }),
      q.div({
        class: 'gluon-date-range-picker-fields',
        children: [
          q.label({ id: startLabelId, for: startId, class: 'gluon-date-range-picker-field-label', children: startLabel }),
          DateInput({
            value: startValue,
            name: startName,
            disabled,
            invalid: message !== undefined,
            onInput: (event) => {
              callListener(startAttributeInput, event);
              if (!event.defaultPrevented) onInput?.(getValue('start', event), 'start', event);
            },
            attributes: {
              ...startNativeAttributes,
              id: startId,
              min,
              max,
              step,
              required,
              aria: { ...startAria, labelledby: `${labelId} ${startLabelId}`, describedby: describedBy },
            },
          }),
          q.label({ id: endLabelId, for: endId, class: 'gluon-date-range-picker-field-label', children: endLabel }),
          DateInput({
            value: endValue,
            name: endName,
            disabled,
            invalid: message !== undefined,
            onInput: (event) => {
              callListener(endAttributeInput, event);
              if (!event.defaultPrevented) onInput?.(getValue('end', event), 'end', event);
            },
            attributes: {
              ...endNativeAttributes,
              id: endId,
              min,
              max,
              step,
              required,
              aria: { ...endAria, labelledby: `${labelId} ${endLabelId}`, describedby: describedBy },
            },
          }),
        ],
      }),
      message === undefined && helper === undefined
        ? nothing
        : q.span({
            id: message === undefined ? helperId : messageId,
            class: message === undefined ? 'gluon-date-range-picker-helper' : 'gluon-date-range-picker-error',
            role: message === undefined ? undefined : 'alert',
            children: message ?? helper,
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

export const DateRangePicker = defineMolecule(renderDateRangePicker, 'DateRangePicker', [dateRangePickerStyleDependency]);
