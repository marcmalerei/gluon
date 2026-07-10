import { defineAtom } from '../component.js';
import { mergeProps } from '../props.js';
import type { TemplateResult } from '../runtime.js';
import { q, type QuarkProps } from '../quarks/index.js';

export interface InputProps {
  readonly value?: string;
  readonly placeholder?: string;
  readonly type?: string;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly onInput?: (event: InputEvent) => void;
  readonly attributes?: QuarkProps<HTMLInputElement>;
}

function renderInput({
  value = '',
  placeholder = '',
  type = 'text',
  name,
  disabled = false,
  onInput,
  attributes = {},
}: InputProps): TemplateResult {
  return q.input(mergeProps({
    class: { gluon: true, atom: true, 'gluon-input': true },
    '.value': value,
    placeholder,
    type,
    name,
    '?disabled': disabled,
    onInput: onInput as EventListener | undefined,
  }, attributes));
}

export const Input = defineAtom(renderInput, 'Input');
