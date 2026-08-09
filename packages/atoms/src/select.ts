import { defineAtom, mergeProps, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { selectStyleDependency } from './select-styles.js';

export type SelectSize = 'small' | 'medium' | 'large';

export type SelectAttributes = Omit<
  QuarkProps<HTMLSelectElement>,
  | 'children'
  | 'value'
  | '.value'
  | 'name'
  | '.name'
  | 'disabled'
  | '.disabled'
  | '?disabled'
  | 'required'
  | '.required'
  | '?required'
  | 'aria'
  | 'aria-invalid'
  | 'ariaInvalid'
  | '.ariaInvalid'
  | 'onChange'
> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLSelectElement>['aria']>, 'invalid'>;
};

export interface SelectProps {
  readonly children?: TemplateValue;
  readonly value?: string;
  readonly name?: string;
  readonly size?: SelectSize;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly fullWidth?: boolean;
  readonly onChange?: (event: Event) => void;
  readonly attributes?: SelectAttributes;
}

function renderSelect({
  children,
  value,
  name,
  size = 'medium',
  disabled = false,
  required = false,
  invalid = false,
  fullWidth = false,
  onChange,
  attributes = {},
}: SelectProps): TemplateResult {
  const { aria, ...selectAttributes } = attributes;
  const merged = mergeProps({
    children,
    class: {
      gluon: true,
      atom: true,
      'gluon-select': true,
      [`is-${size}`]: true,
      'is-full-width': fullWidth,
    },
    '.value': value,
    name,
    '?disabled': disabled,
    '?required': required,
    aria: { ...aria, invalid: invalid || undefined },
    onChange: onChange as EventListener | undefined,
  }, selectAttributes);
  return q.select(merged as QuarkProps<HTMLSelectElement>);
}

export const Select = defineAtom(renderSelect, 'Select', [selectStyleDependency]);
