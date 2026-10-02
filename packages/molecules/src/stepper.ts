import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { stepperStyleDependency } from './stepper-styles.js';

export type StepperStepStatus = 'complete' | 'current' | 'upcoming' | 'error' | 'disabled';
export type StepperAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id'>;

export interface StepperStep {
  readonly id: string;
  readonly label: TemplateValue;
  readonly status?: StepperStepStatus;
  readonly description?: TemplateValue;
  readonly href?: string;
  readonly content?: TemplateValue;
}

export interface StepperProps {
  readonly id: string;
  readonly label: string;
  readonly steps: readonly StepperStep[];
  readonly attributes?: StepperAttributes;
}

function renderStepper({ id, label, steps, attributes = {} }: StepperProps): TemplateResult {
  assertId(id);
  if (!label.trim()) throw new TypeError('Stepper.label must be a non-empty string.');
  if (steps.length === 0) throw new TypeError('Stepper.steps must contain at least one step.');
  const seen = new Set<string>();
  const items = steps.map((step, index) => {
    assertId(step.id);
    if (seen.has(step.id)) throw new TypeError(`Stepper step ids must be unique: ${step.id}`);
    seen.add(step.id);
    const status = step.status ?? (index === 0 ? 'current' : 'upcoming');
    const stepId = `${id}-${step.id}`;
    const descriptionId = step.description === undefined ? undefined : `${stepId}-description`;
    const labelNode = step.href && status !== 'disabled'
      ? q.a({ href: step.href, class: 'gluon-stepper-label', children: step.label })
      : q.span({ class: 'gluon-stepper-label', children: step.label });
    return q.li({
      id: stepId,
      class: [{ 'gluon-stepper-step': true, [`is-${status}`]: true }, step.content === undefined ? undefined : 'has-content'],
      data: { status },
      'aria-current': status === 'current' ? 'step' : undefined,
      'aria-disabled': status === 'disabled' ? 'true' : undefined,
      'aria-describedby': descriptionId,
      children: [
        q.span({ class: 'gluon-stepper-marker', 'aria-hidden': 'true', children: status === 'complete' ? '✓' : String(index + 1) }),
        labelNode,
        step.description === undefined ? nothing : q.span({ id: descriptionId, class: 'gluon-stepper-description', children: step.description }),
        step.content === undefined ? nothing : q.div({ class: 'gluon-stepper-content', children: step.content }),
      ],
    });
  });
  return q.nav({ ...attributes, id, class: [{ gluon: true, molecule: true, 'gluon-stepper': true }, attributes.class], aria: { ...attributes.aria, label }, children: q.ol({ children: items }) });
}

function assertId(value: string): void {
  if (!value.trim() || /\s/u.test(value)) throw new TypeError('Stepper ids must be non-empty DOM ids without whitespace.');
}

export const Stepper = defineMolecule(renderStepper, 'Stepper', [stepperStyleDependency]);
