import { Select, type SelectAttributes } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { sortControlStyleDependency } from './sort-control-styles.js';

export interface SortControlOption {
  readonly value: string;
  readonly label: TemplateValue;
  readonly disabled?: boolean;
}

export type SortControlAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type SortControlSelectAttributes = Omit<SelectAttributes, 'id'>;

export interface SortControlProps {
  readonly id: string;
  readonly label: string;
  readonly options: readonly SortControlOption[];
  readonly value?: string;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly helper?: TemplateValue;
  readonly error?: TemplateValue;
  readonly onChange?: (value: string, event: Event) => void;
  readonly selectAttributes?: SortControlSelectAttributes;
  readonly attributes?: SortControlAttributes;
}

function renderSortControl({
  id,
  label,
  options,
  value,
  name,
  disabled = false,
  helper,
  error,
  onChange,
  selectAttributes = {},
  attributes = {},
}: SortControlProps): TemplateResult {
  assertDomId('SortControl.id', id);
  if (!label.trim()) throw new TypeError('SortControl.label must be a non-empty string.');
  const selectId = `${id}-select`;
  const seen = new Set<string>();
  for (const option of options) {
    if (!option.value.trim()) throw new TypeError('SortControl option values must be non-empty strings.');
    if (seen.has(option.value)) throw new TypeError(`SortControl option values must be unique: ${option.value}`);
    seen.add(option.value);
  }
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [selectAttributes.aria?.describedby, error !== undefined ? errorId : helper !== undefined ? descriptionId : undefined]
    .filter(Boolean)
    .join(' ') || undefined;
  const { aria, ...nativeSelectAttributes } = selectAttributes;

  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-sort-control': true }, attributes.class],
    children: [
      q.label({ id: labelId, for: selectId, class: 'gluon-sort-control-label', children: label }),
      Select({
        value,
        name,
        disabled,
        invalid: error !== undefined,
        fullWidth: true,
        onChange: (event) => onChange?.((event.target as HTMLSelectElement).value, event),
        children: options.map((option) => q.option({ value: option.value, disabled: option.disabled, children: option.label })),
        attributes: {
          ...nativeSelectAttributes,
          id: selectId,
          aria: { ...aria, labelledby: labelId, describedby: describedBy },
        },
      }),
      error === undefined && helper === undefined
        ? nothing
        : q.span({
            id: error === undefined ? descriptionId : errorId,
            class: error === undefined ? 'gluon-sort-control-helper' : 'gluon-sort-control-error',
            role: error === undefined ? undefined : 'alert',
            children: error ?? helper,
          }),
    ],
  });
}

function assertDomId(name: string, value: string): void {
  if (!value.trim() || /\s/u.test(value)) throw new TypeError(`${name} must be a non-empty DOM id without whitespace.`);
}

export const SortControl = defineMolecule(renderSortControl, 'SortControl', [sortControlStyleDependency]);
