import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { Listbox, q, type ListboxOption, type QuarkProps } from '@gluonjs/quarks';
import { listboxFieldStyleDependency } from './listbox-field-styles.js';

export type ListboxFieldAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type ListboxFieldListboxAttributes = NonNullable<Parameters<typeof Listbox>[0]['attributes']>;

export interface ListboxFieldProps {
  readonly id: string;
  readonly label: string;
  readonly options: readonly ListboxOption[];
  readonly value?: string;
  readonly helper?: TemplateValue;
  readonly error?: TemplateValue;
  readonly onChange?: (value: string) => void;
  readonly listboxAttributes?: ListboxFieldListboxAttributes;
  readonly attributes?: ListboxFieldAttributes;
}

function renderListboxField({
  id,
  label,
  options,
  value,
  helper,
  error,
  onChange,
  listboxAttributes = {},
  attributes = {},
}: ListboxFieldProps): TemplateResult {
  assertNonEmpty('ListboxField.id', id);
  assertNonEmpty('ListboxField.label', label);
  if (/\s/u.test(id)) throw new TypeError('ListboxField.id must not contain whitespace.');
  const listboxId = `${id}-listbox`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [listboxAttributes.aria?.describedby, error ? errorId : helper ? descriptionId : undefined].filter(Boolean).join(' ') || undefined;
  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-listbox-field': true }, attributes.class],
    children: [
      q.span({ class: 'gluon-listbox-field-label', id: `${id}-label`, children: label }),
      Listbox({
        id: listboxId,
        label,
        value,
        options,
        onChange,
        attributes: {
          ...listboxAttributes,
          aria: { ...listboxAttributes.aria, labelledby: `${id}-label`, describedby: describedBy, invalid: error !== undefined || undefined },
        },
      }),
      error === undefined && helper === undefined ? nothing : q.span({ id: error ? errorId : descriptionId, class: error ? 'gluon-listbox-field-error' : 'gluon-listbox-field-helper', role: error ? 'alert' : undefined, children: error ?? helper }),
    ],
  });
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

export const ListboxField = defineMolecule(renderListboxField, 'ListboxField', [listboxFieldStyleDependency]);
