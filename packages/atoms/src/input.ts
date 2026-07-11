import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';

export interface InputProps {
  readonly value?: string;
  readonly placeholder?: string;
  readonly type?: string;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly onInput?: (event: InputEvent) => void;
  readonly attributes?: QuarkProps<HTMLInputElement>;
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
