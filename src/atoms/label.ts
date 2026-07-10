import { defineAtom } from '../component.js';
import type { TemplateResult, TemplateValue } from '../runtime.js';
import { q, type QuarkProps } from '../quarks/index.js';

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
