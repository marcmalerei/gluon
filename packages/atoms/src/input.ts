import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';

type InputAttributes = Omit<
  QuarkProps<HTMLInputElement>,
  | 'children'
  | 'value'
  | '.value'
  | 'placeholder'
  | '.placeholder'
  | 'type'
  | '.type'
  | 'name'
  | '.name'
  | 'disabled'
  | '.disabled'
  | '?disabled'
  | 'aria'
  | 'aria-invalid'
  | 'ariaInvalid'
  | '.ariaInvalid'
> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLInputElement>['aria']>, 'invalid'>;
};

export interface InputProps {
  readonly value?: string;
  readonly placeholder?: string;
  readonly type?: string;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly onInput?: (event: InputEvent) => void;
  readonly attributes?: InputAttributes;
}

function renderInput({
  value = '',
  placeholder = '',
  type = 'text',
  name,
  disabled = false,
  invalid = false,
  onInput,
  attributes = {},
}: InputProps): TemplateResult {
  const { aria, ...inputAttributes } = attributes;
  return q.input(mergeProps({
    class: { gluon: true, atom: true, 'gluon-input': true },
    '.value': value,
    placeholder,
    type,
    name,
    '?disabled': disabled,
    aria: { ...aria, invalid: invalid || undefined },
    onInput: onInput as EventListener | undefined,
  }, inputAttributes));
}

export const Input = defineAtom(renderInput, 'Input');
