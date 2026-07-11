import { defineAtom, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';

export interface LabelProps {
  readonly children: TemplateValue;
  readonly attributes?: QuarkProps<HTMLSpanElement>;
}

function renderLabel({ children, attributes = {} }: LabelProps): TemplateResult {
  return q.span({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-label': true }, attributes.class],
    children,
  });
}

export const Label = defineAtom(renderLabel, 'Label');
