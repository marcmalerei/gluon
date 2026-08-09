import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { radioStyleDependency } from './radio-styles.js';

export type RadioAttributes = Omit<
  QuarkProps<HTMLInputElement>,
  | 'children'
  | 'type'
  | '.type'
  | 'checked'
  | '.checked'
  | '?checked'
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

export interface RadioProps {
  readonly checked?: boolean;
  readonly name?: string;
  readonly value?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly onChange?: (event: Event) => void;
  readonly attributes?: RadioAttributes;
}

function renderRadio({
  checked,
  name,
  value,
  disabled = false,
  required = false,
  invalid = false,
  onChange,
  attributes = {},
}: RadioProps): TemplateResult {
  const { aria, ...radioAttributes } = attributes;
  const controlledState = checked === undefined ? {} : {
    '?checked': checked,
    '.checked': checked,
  };
  const merged = mergeProps({
    class: { gluon: true, atom: true, 'gluon-radio': true },
    type: 'radio',
    name,
    value,
    '?disabled': disabled,
    '?required': required,
    aria: { ...aria, invalid: invalid || undefined },
    onChange: onChange as EventListener | undefined,
    ...controlledState,
  }, radioAttributes);
  return q.input(merged as QuarkProps<HTMLInputElement>);
}

export const Radio = defineAtom(renderRadio, 'Radio', [radioStyleDependency]);
