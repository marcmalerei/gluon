import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { fileInputStyleDependency } from './file-input-styles.js';

export type FileInputCapture = boolean | 'user' | 'environment';

export type FileInputAttributes = Omit<
  QuarkProps<HTMLInputElement>,
  | 'children'
  | 'value'
  | '.value'
  | 'type'
  | '.type'
  | 'accept'
  | 'multiple'
  | '?multiple'
  | 'capture'
  | 'name'
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
> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLInputElement>['aria']>, 'invalid'>;
};

export interface FileInputProps {
  readonly accept?: string;
  readonly capture?: FileInputCapture;
  readonly multiple?: boolean;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly onChange?: (event: Event) => void;
  readonly attributes?: FileInputAttributes;
}

function renderFileInput({
  accept,
  capture,
  multiple = false,
  name,
  disabled = false,
  required = false,
  invalid = false,
  onChange,
  attributes = {},
}: FileInputProps): TemplateResult {
  const { aria, ...inputAttributes } = attributes;
  const native = mergeProps({
    class: { gluon: true, atom: true, 'gluon-file-input': true },
    type: 'file',
    accept,
    capture,
    name,
    '?multiple': multiple,
    '?disabled': disabled,
    '?required': required,
    aria: { ...aria, invalid: invalid || undefined },
    onChange: onChange as EventListener | undefined,
  }, inputAttributes) as unknown as QuarkProps<HTMLInputElement>;
  return q.input(native);
}

export const FileInput = defineAtom(renderFileInput, 'FileInput', [fileInputStyleDependency]);
