import { Input, Label, type InputProps } from '../atoms/index.js';
import { defineMolecule } from '../component.js';
import { nothing, type TemplateResult } from '../runtime.js';
import { q, type QuarkProps } from '../quarks/index.js';

export interface FormFieldProps extends InputProps {
  readonly label: string;
  readonly helper?: string;
  readonly fieldAttributes?: QuarkProps<HTMLLabelElement>;
}

function renderFormField({
  label,
  helper,
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
      Input(input),
      helper
        ? q.span({ class: { 'gluon-form-helper': true }, children: helper })
        : nothing,
    ],
  });
}

export const FormField = defineMolecule(renderFormField, 'FormField');
