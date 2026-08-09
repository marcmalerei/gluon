import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { checkboxStyleDependency } from './checkbox-styles.js';

export type CheckboxAttributes = Omit<
  QuarkProps<HTMLInputElement>,
  | 'children'
  | 'type'
  | '.type'
  | 'checked'
  | '.checked'
  | '?checked'
  | 'indeterminate'
  | '.indeterminate'
  | 'name'
  | '.name'
  | 'value'
  | '.value'
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
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLInputElement>['aria']>, 'invalid'>;
};

export interface CheckboxProps {
  readonly checked?: boolean;
  readonly indeterminate?: boolean;
  readonly name?: string;
  readonly value?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly onChange?: (event: Event) => void;
  readonly attributes?: CheckboxAttributes;
}

function renderCheckbox({
  checked,
  indeterminate,
  name,
  value,
  disabled = false,
  required = false,
  invalid = false,
  onChange,
  attributes = {},
}: CheckboxProps): TemplateResult {
  const { aria, ...checkboxAttributes } = attributes;
  const controlledState = checked === undefined ? {} : {
    '?checked': checked,
    '.checked': checked,
  };
  const indeterminateState = indeterminate === undefined ? {} : {
    '.indeterminate': indeterminate,
  };
  const merged = mergeProps({
    class: { gluon: true, atom: true, 'gluon-checkbox': true },
    type: 'checkbox',
    name,
    value,
    '?disabled': disabled,
    '?required': required,
    aria: { ...aria, invalid: invalid || undefined },
    onChange: onChange as EventListener | undefined,
    ...controlledState,
    ...indeterminateState,
  }, checkboxAttributes);
  return q.input(merged as QuarkProps<HTMLInputElement>);
}

export const Checkbox = defineAtom(renderCheckbox, 'Checkbox', [checkboxStyleDependency]);
