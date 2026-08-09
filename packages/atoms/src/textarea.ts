import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { textareaStyleDependency } from './textarea-styles.js';

export type TextareaAttributes = Omit<
  QuarkProps<HTMLTextAreaElement>,
  | 'children'
  | 'value'
  | '.value'
  | 'name'
  | '.name'
  | 'placeholder'
  | '.placeholder'
  | 'disabled'
  | '.disabled'
  | '?disabled'
  | 'readonly'
  | 'readOnly'
  | '.readOnly'
  | '?readonly'
  | 'required'
  | '.required'
  | '?required'
  | 'rows'
  | '.rows'
  | 'aria'
  | 'aria-invalid'
  | 'ariaInvalid'
  | '.ariaInvalid'
  | 'onInput'
  | 'onChange'
> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLTextAreaElement>['aria']>, 'invalid'>;
};

export interface TextareaProps {
  readonly value?: string;
  readonly name?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly rows?: number;
  readonly fullWidth?: boolean;
  readonly onInput?: (event: InputEvent) => void;
  readonly onChange?: (event: Event) => void;
  readonly attributes?: TextareaAttributes;
}

function renderTextarea({
  value = '',
  name,
  placeholder = '',
  disabled = false,
  readOnly = false,
  required = false,
  invalid = false,
  rows,
  fullWidth = false,
  onInput,
  onChange,
  attributes = {},
}: TextareaProps): TemplateResult {
  const { aria, ...textareaAttributes } = attributes;
  const merged = mergeProps({
    class: {
      gluon: true,
      atom: true,
      'gluon-textarea': true,
      'is-full-width': fullWidth,
    },
    '.value': value,
    name,
    placeholder,
    '?disabled': disabled,
    '?readonly': readOnly,
    '?required': required,
    rows,
    aria: { ...aria, invalid: invalid || undefined },
    onInput: onInput as EventListener | undefined,
    onChange: onChange as EventListener | undefined,
  }, textareaAttributes);
  return q.textarea(merged as QuarkProps<HTMLTextAreaElement>);
}

export const Textarea = defineAtom(renderTextarea, 'Textarea', [textareaStyleDependency]);
