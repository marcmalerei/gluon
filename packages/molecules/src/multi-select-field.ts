import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { multiSelectFieldStyleDependency } from './multi-select-field-styles.js';

export interface MultiSelectFieldOption {
  readonly value: string;
  readonly label: TemplateValue;
  readonly disabled?: boolean;
}

export type MultiSelectFieldAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type MultiSelectFieldSelectAttributes = Omit<QuarkProps<HTMLSelectElement>, 'children' | 'id' | 'multiple' | 'value' | '.value' | 'name' | 'disabled' | '?disabled' | 'required' | '?required' | 'aria' | 'onChange'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLSelectElement>['aria']>, 'label' | 'labelledby' | 'invalid' | 'multiselectable'>;
  readonly onChange?: ((event: Event) => unknown) | { handleEvent(event: Event): void };
};

export interface MultiSelectFieldProps {
  readonly id: string;
  readonly label: string;
  readonly options: readonly MultiSelectFieldOption[];
  readonly values?: readonly string[];
  readonly name?: string;
  readonly size?: number;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly helper?: TemplateValue;
  readonly error?: TemplateValue;
  readonly onChange?: (values: readonly string[], event: Event) => void;
  readonly selectAttributes?: MultiSelectFieldSelectAttributes;
  readonly attributes?: MultiSelectFieldAttributes;
}

function renderMultiSelectField({
  id,
  label,
  options,
  values = [],
  name,
  size = 5,
  disabled = false,
  required = false,
  helper,
  error,
  onChange,
  selectAttributes = {},
  attributes = {},
}: MultiSelectFieldProps): TemplateResult {
  assertDomId('MultiSelectField.id', id);
  if (!label.trim()) throw new TypeError('MultiSelectField.label must be a non-empty string.');
  if (!Number.isInteger(size) || size < 2) throw new RangeError('MultiSelectField.size must be an integer of at least 2.');
  const seen = new Set<string>();
  for (const option of options) {
    if (!option.value.trim()) throw new TypeError('MultiSelectField option values must be non-empty strings.');
    if (seen.has(option.value)) throw new TypeError(`MultiSelectField option values must be unique: ${option.value}`);
    seen.add(option.value);
  }
  const selected = new Set(values);
  const selectId = `${id}-select`;
  const labelId = `${id}-label`;
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const { aria, onChange: attributeChange, ...nativeSelectAttributes } = selectAttributes;
  const describedBy = [aria?.describedby, errorId ?? helperId].filter(Boolean).join(' ') || undefined;
  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-multi-select-field': true }, attributes.class],
    children: [
      q.label({ id: labelId, for: selectId, class: 'gluon-multi-select-field-label', children: label }),
      q.select({
        ...nativeSelectAttributes,
        id: selectId,
        multiple: true,
        size,
        name,
        disabled,
        required,
        aria: { ...aria, labelledby: labelId, describedby: describedBy, invalid: error !== undefined || undefined, multiselectable: true },
        class: [{ gluon: true, molecule: true, 'gluon-multi-select-field-select': true }, selectAttributes.class],
        onChange: (event: Event) => {
          callListener(attributeChange, event);
          if (!event.defaultPrevented) {
            const select = event.currentTarget as HTMLSelectElement;
            onChange?.([...select.selectedOptions].map((option) => option.value), event);
          }
        },
        children: options.map((option) => q.option({ value: option.value, disabled: option.disabled, selected: selected.has(option.value), children: option.label })),
      }),
      error === undefined && helper === undefined
        ? nothing
        : q.span({ id: error === undefined ? helperId : errorId, class: error === undefined ? 'gluon-multi-select-field-helper' : 'gluon-multi-select-field-error', role: error === undefined ? undefined : 'alert', children: error ?? helper }),
    ],
  });
}

function assertDomId(name: string, value: string): void {
  if (!value.trim() || /\s/u.test(value)) throw new TypeError(`${name} must be a non-empty DOM id without whitespace.`);
}

function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const MultiSelectField = defineMolecule(renderMultiSelectField, 'MultiSelectField', [multiSelectFieldStyleDependency]);
