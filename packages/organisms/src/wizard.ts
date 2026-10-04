import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { wizardStyleDependency } from './wizard-styles.js';

export type WizardAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id'>;
export type WizardOpenChangeEvent = KeyboardEvent | MouseEvent;

export interface WizardStep {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly content: TemplateValue;
  readonly disabled?: boolean;
}

export interface WizardProps {
  readonly id: string;
  readonly steps: readonly WizardStep[];
  readonly currentStep?: number;
  readonly title?: TemplateValue;
  readonly stepNavigationLabel?: string;
  readonly currentStepLabel?: string;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
  readonly attributes?: WizardAttributes;
  readonly onStepChange?: (step: number, event: WizardOpenChangeEvent) => void;
}

function safeId(value: string, fallback: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return normalized || fallback;
}

function validWizard(id: string, steps: readonly WizardStep[], currentStep: number): boolean {
  return Boolean(id.trim()) && !/\s/u.test(id) && Number.isInteger(currentStep) && currentStep >= 0 && currentStep < steps.length
    && steps.length > 0
    && new Set(steps.map((step) => step.id)).size === steps.length
    && steps.every((step) => typeof step.id === 'string' && Boolean(step.id.trim()) && typeof step.label === 'string' && Boolean(step.label.trim()));
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function renderWizard({
  id, steps, currentStep = 0, title, stepNavigationLabel = 'Wizard steps', currentStepLabel = 'Current step',
  previousLabel = 'Previous', nextLabel = 'Next', attributes = {}, onStepChange,
}: WizardProps): TemplateResult {
  assertNonEmpty('Wizard.stepNavigationLabel', stepNavigationLabel);
  assertNonEmpty('Wizard.currentStepLabel', currentStepLabel);
  assertNonEmpty('Wizard.previousLabel', previousLabel);
  assertNonEmpty('Wizard.nextLabel', nextLabel);
  const valid = validWizard(id, steps, currentStep);
  const rootId = valid ? id : safeId(id, 'wizard-invalid');
  const activeStep = valid ? steps[currentStep] : undefined;
  const activeStepId = activeStep ? `${rootId}-step-${safeId(activeStep.id, String(currentStep + 1))}` : `${rootId}-step-invalid`;
  const titleId = `${rootId}-title`;
  const activeLabelId = `${activeStepId}-label`;
  const { 'aria-label': ariaLabel, ...nativeAttributes } = attributes;
  const changeStep = (index: number, event: MouseEvent): void => {
    if (!valid || index === currentStep || steps[index]?.disabled) return;
    onStepChange?.(index, event);
  };
  const stepButtons = valid ? steps.map((step, index) => {
    const stepId = `${rootId}-step-${safeId(step.id, String(index + 1))}`;
    const labelId = `${stepId}-label`;
    return q.li({ part: `step step-${index === currentStep ? 'current' : index < currentStep ? 'complete' : 'pending'}`, class: { 'gluon-wizard-step': true, 'is-current': index === currentStep, 'is-complete': index < currentStep }, 'aria-current': index === currentStep ? 'step' : undefined, children: q.button({ id: stepId, type: 'button', disabled: step.disabled, part: 'step-button', class: { 'gluon-wizard-step-button': true }, aria: { describedby: step.description ? `${labelId}-description` : undefined }, onClick: (event: MouseEvent) => changeStep(index, event), children: [q.span({ id: labelId, part: 'step-label', children: step.label }), step.description ? q.small({ id: `${labelId}-description`, part: 'step-description', children: step.description }) : nothing] }) });
  }) : [];
  return q.section({ ...nativeAttributes, id: rootId, part: 'root', class: [{ gluon: true, organism: true, 'gluon-wizard': true }, attributes.class], 'data-state': valid ? (currentStep === 0 ? 'first' : currentStep === steps.length - 1 ? 'last' : 'middle') : 'invalid', 'aria-label': ariaLabel ?? 'Wizard', children: [
    title ? q.header({ part: 'header', class: 'gluon-wizard-header', children: q.h2({ id: titleId, children: title }) }) : nothing,
    valid ? q.nav({ part: 'step-navigation', class: 'gluon-wizard-navigation', 'aria-label': stepNavigationLabel, children: q.ol({ children: stepButtons }) }) : nothing,
    valid ? q.p({ part: 'current-step', class: 'gluon-wizard-current', 'aria-live': 'polite', children: `${currentStepLabel}: ${currentStep + 1} / ${steps.length}` }) : q.p({ part: 'state-message', children: 'Wizard state is unavailable' }),
    valid ? q.section({ part: 'content', class: 'gluon-wizard-content', 'aria-labelledby': activeLabelId, children: [q.h3({ id: activeLabelId, class: 'gluon-wizard-content-title', children: activeStep?.label }), activeStep?.content ?? nothing] }) : nothing,
    valid ? q.footer({ part: 'controls', class: 'gluon-wizard-controls', children: [q.button({ type: 'button', part: 'previous', class: 'gluon-wizard-control', disabled: currentStep === 0, onClick: (event: MouseEvent) => changeStep(currentStep - 1, event), children: previousLabel }), q.button({ type: 'button', part: 'next', class: 'gluon-wizard-control', disabled: currentStep === steps.length - 1, onClick: (event: MouseEvent) => changeStep(currentStep + 1, event), children: nextLabel })] }) : nothing,
  ] });
}

export const Wizard = defineOrganism(renderWizard, 'Wizard', [wizardStyleDependency]);
