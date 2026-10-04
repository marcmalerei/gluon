import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { onboardingFlowStyleDependency } from './onboarding-flow-styles.js';

export type OnboardingFlowAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id'>;
export type OnboardingFlowChangeEvent = KeyboardEvent | MouseEvent;
export interface OnboardingFlowStep { readonly id: string; readonly label: string; readonly description?: string; readonly content: TemplateValue; }
export interface OnboardingFlowProps {
  readonly id: string;
  readonly steps: readonly OnboardingFlowStep[];
  readonly currentStep?: number;
  readonly completed?: boolean;
  readonly title?: TemplateValue;
  readonly navigationLabel?: string;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
  readonly completeLabel?: string;
  readonly completionContent?: TemplateValue;
  readonly attributes?: OnboardingFlowAttributes;
  readonly onStepChange?: (step: number, event: OnboardingFlowChangeEvent) => void;
  readonly onComplete?: (event: OnboardingFlowChangeEvent) => void;
}

function safeId(value: string): string { return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'onboarding-flow-invalid'; }
function validFlow(id: string, steps: readonly OnboardingFlowStep[], currentStep: number): boolean { return Boolean(id.trim()) && !/\s/u.test(id) && steps.length > 0 && Number.isInteger(currentStep) && currentStep >= 0 && currentStep < steps.length && new Set(steps.map((step) => step.id)).size === steps.length && steps.every((step) => Boolean(step.id.trim()) && Boolean(step.label.trim())); }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }

function renderOnboardingFlow({ id, steps, currentStep = 0, completed = false, title, navigationLabel = 'Onboarding steps', previousLabel = 'Back', nextLabel = 'Continue', completeLabel = 'Finish setup', completionContent, attributes = {}, onStepChange, onComplete }: OnboardingFlowProps): TemplateResult {
  assertNonEmpty('OnboardingFlow.navigationLabel', navigationLabel); assertNonEmpty('OnboardingFlow.previousLabel', previousLabel); assertNonEmpty('OnboardingFlow.nextLabel', nextLabel); assertNonEmpty('OnboardingFlow.completeLabel', completeLabel);
  const valid = validFlow(id, steps, currentStep); const rootId = valid ? id : safeId(id); const active = valid ? steps[currentStep] : undefined; const activeId = active ? `${rootId}-step-${safeId(active.id)}` : `${rootId}-invalid-step`;
  const { 'aria-label': ariaLabel, ...nativeAttributes } = attributes;
  const change = (step: number, event: MouseEvent): void => { if (valid && step >= 0 && step < steps.length && step !== currentStep) onStepChange?.(step, event); };
  const stepItems = valid ? steps.map((step, index) => q.li({ class: { 'gluon-onboarding-flow-step': true, 'is-current': index === currentStep, 'is-complete': index < currentStep }, children: q.button({ id: `${rootId}-step-${safeId(step.id)}`, type: 'button', part: 'step-button', 'aria-current': index === currentStep ? 'step' : undefined, onClick: (event: MouseEvent) => change(index, event), children: [q.span({ part: 'step-label', children: step.label }), step.description ? q.small({ part: 'step-description', children: step.description }) : nothing] }) })) : [];
  const state = !valid ? 'invalid' : completed ? 'complete' : currentStep === steps.length - 1 ? 'last' : currentStep === 0 ? 'first' : 'middle';
  return q.section({ ...nativeAttributes, id: rootId, part: 'root', class: [{ gluon: true, organism: true, 'gluon-onboarding-flow': true }, attributes.class], 'data-state': state, 'aria-label': ariaLabel ?? 'Onboarding flow', children: [title ? q.header({ part: 'header', class: 'gluon-onboarding-flow-header', children: q.h2({ children: title }) }) : nothing, valid && !completed ? q.nav({ part: 'navigation', class: 'gluon-onboarding-flow-navigation', 'aria-label': navigationLabel, children: q.ol({ children: stepItems }) }) : nothing, valid && !completed ? q.section({ part: 'content', class: 'gluon-onboarding-flow-content', 'aria-labelledby': activeId, children: [q.h3({ id: activeId, children: active?.label }), active?.content ?? nothing] }) : completed ? q.section({ part: 'completion', class: 'gluon-onboarding-flow-completion', children: completionContent ?? 'Setup is complete.' }) : q.p({ part: 'state-message', children: 'Onboarding state is unavailable' }), valid && !completed ? q.footer({ part: 'controls', class: 'gluon-onboarding-flow-controls', children: [q.button({ type: 'button', part: 'previous', disabled: currentStep === 0, onClick: (event: MouseEvent) => change(currentStep - 1, event), children: previousLabel }), currentStep === steps.length - 1 ? q.button({ type: 'button', part: 'complete', onClick: (event: MouseEvent) => onComplete?.(event), children: completeLabel }) : q.button({ type: 'button', part: 'next', onClick: (event: MouseEvent) => change(currentStep + 1, event), children: nextLabel })] }) : nothing] });
}

export const OnboardingFlow = defineOrganism(renderOnboardingFlow, 'OnboardingFlow', [onboardingFlowStyleDependency]);
