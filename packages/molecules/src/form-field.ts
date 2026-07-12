import { Input, Label, type InputProps } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';

type FormFieldAttributes = Omit<QuarkProps<HTMLLabelElement>, 'children'>;

export interface FormFieldProps extends InputProps {
  readonly label: string;
  readonly helper?: string;
  readonly error?: string;
  readonly fieldAttributes?: FormFieldAttributes;
}

function renderFormField({
  label,
  helper,
  error,
  fieldAttributes = {},
  ...input
}: FormFieldProps): TemplateResult {
  return q.label({
    ...fieldAttributes,
    class: [
      { gluon: true, molecule: true, 'gluon-form-field': true },
      fieldAttributes.class,
    ],
    children: [
      Label({ children: label }),
      Input({ ...input, invalid: input.invalid ?? Boolean(error) }),
      error
        ? q.span({ class: { 'gluon-form-error': true }, role: 'alert', children: error })
        : helper
          ? q.span({ class: { 'gluon-form-helper': true }, children: helper })
          : nothing,
    ],
  });
}

export const FormField = defineMolecule(renderFormField, 'FormField');
