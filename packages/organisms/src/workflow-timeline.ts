import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { workflowTimelineStyleDependency } from './workflow-timeline-styles.js';

export type WorkflowTimelineStatus = 'completed' | 'current' | 'blocked' | 'pending' | 'skipped';
export type WorkflowTimelineOverallState = 'loading' | 'empty' | 'active' | 'blocked' | 'degraded' | 'complete' | 'invalid';
export type WorkflowTimelineAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id'>;

export interface WorkflowTimelineStep {
  readonly id: string;
  readonly label: string;
  readonly status: WorkflowTimelineStatus;
  readonly description?: string;
  readonly role?: string;
  readonly evidence?: string;
  readonly action?: TemplateValue;
  readonly link?: TemplateValue;
}

export interface WorkflowTimelineMessages {
  readonly timeline?: string;
  readonly loading?: string;
  readonly empty?: string;
  readonly invalid?: string;
  readonly overall?: (state: WorkflowTimelineOverallState, stepCount: number) => string;
  readonly status?: (status: WorkflowTimelineStatus) => string;
  readonly step?: (position: number, total: number) => string;
  readonly nextAction?: string;
  readonly responsibleRole?: string;
  readonly evidence?: string;
}

export interface WorkflowTimelineProps {
  readonly id: string;
  readonly steps?: readonly WorkflowTimelineStep[];
  readonly state?: WorkflowTimelineOverallState;
  readonly nextAction?: TemplateValue;
  readonly nextActionLabel?: string;
  readonly role?: string;
  readonly evidence?: string;
  readonly statusLabel?: string;
  readonly messages?: WorkflowTimelineMessages;
  readonly attributes?: WorkflowTimelineAttributes;
}

const defaultMessages: Required<Pick<WorkflowTimelineMessages, 'timeline' | 'loading' | 'empty' | 'invalid' | 'nextAction' | 'responsibleRole' | 'evidence'>> = {
  timeline: 'Workflow timeline', loading: 'Loading workflow', empty: 'No workflow steps', invalid: 'Workflow state is unavailable',
  nextAction: 'Next action', responsibleRole: 'Responsible role', evidence: 'Last evidence',
};
const defaultStatusMessages: Readonly<Record<WorkflowTimelineStatus, string>> = Object.freeze({
  completed: 'Completed', current: 'Current', blocked: 'Blocked', pending: 'Pending', skipped: 'Skipped',
});
const defaultOverallMessages: Readonly<Record<WorkflowTimelineOverallState, string>> = Object.freeze({
  loading: 'Workflow is loading', empty: 'Workflow has no steps', active: 'Workflow is in progress', blocked: 'Workflow is blocked', degraded: 'Workflow needs attention', complete: 'Workflow is complete', invalid: 'Workflow state is unavailable',
});

function safeId(value: string, fallback: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return normalized || fallback;
}

function validate(id: string, steps: readonly WorkflowTimelineStep[], state?: WorkflowTimelineOverallState): boolean {
  if (!id.trim() || /\s/u.test(id)) return false;
  if (new Set(steps.map((step) => step.id)).size !== steps.length || steps.some((step) => typeof step.id !== 'string' || typeof step.label !== 'string' || !step.id.trim() || !step.label.trim())) return false;
  if (steps.some((step) => !['completed', 'current', 'blocked', 'pending', 'skipped'].includes(step.status))) return false;
  const currents = steps.filter((step) => step.status === 'current').length;
  if (currents > 1) return false;
  if (state === 'empty' && steps.length > 0) return false;
  if (state && !['loading', 'empty', 'active', 'blocked', 'degraded', 'complete', 'invalid'].includes(state)) return false;
  if (state === 'active' && (steps.length === 0 || steps.some((step) => step.status === 'blocked') || steps.every((step) => ['completed', 'skipped'].includes(step.status)))) return false;
  if (state === 'complete' && (steps.length === 0 || steps.some((step) => !['completed', 'skipped'].includes(step.status)))) return false;
  if (state === 'blocked' && !steps.some((step) => step.status === 'blocked')) return false;
  return true;
}

function deriveState(steps: readonly WorkflowTimelineStep[]): WorkflowTimelineOverallState {
  if (steps.length === 0) return 'empty';
  if (steps.some((step) => step.status === 'blocked')) return 'blocked';
  if (steps.every((step) => ['completed', 'skipped'].includes(step.status))) return 'complete';
  return 'active';
}

function renderWorkflowTimeline({ id, steps = [], state, nextAction, nextActionLabel, role, evidence, statusLabel, messages = {}, attributes = {} }: WorkflowTimelineProps): TemplateResult {
  const m = { ...defaultMessages, ...messages };
  const valid = validate(id, steps, state);
  const effectiveState = valid ? (state ?? deriveState(steps)) : 'invalid';
  const rootId = valid ? id : safeId(id, 'workflow-timeline-invalid');
  const summaryId = `${rootId}-summary`;
  const summary = statusLabel ?? messages.overall?.(effectiveState, steps.length) ?? defaultOverallMessages[effectiveState];
  const statusText = (status: WorkflowTimelineStatus) => messages.status?.(status) ?? defaultStatusMessages[status];
  const stepText = (position: number) => messages.step?.(position, steps.length) ?? `${position} / ${steps.length}`;
  const usedStepIds = new Set<string>();
  const list = valid ? steps.map((step, index) => {
    const baseStepId = `${rootId}-step-${safeId(step.id, String(index + 1))}`;
    let stepId = baseStepId;
    let suffix = 2;
    while (usedStepIds.has(stepId)) stepId = `${baseStepId}-${suffix++}`;
    usedStepIds.add(stepId);
    const labelId = `${stepId}-label`;
    const descriptionId = step.description ? `${stepId}-description` : undefined;
    const statusId = `${stepId}-status`;
    const describedBy = [descriptionId, statusId].filter(Boolean).join(' ') || undefined;
    return q.li({ id: stepId, part: `step step-${step.status}`, 'data-state': step.status, class: { 'gluon-workflow-timeline-step': true, [`is-${step.status}`]: true }, 'aria-current': step.status === 'current' ? 'step' : undefined, 'aria-labelledby': labelId, 'aria-describedby': describedBy, children: [
      q.div({ class: { 'gluon-workflow-timeline-step-content': true }, children: [
        q.span({ class: { 'gluon-workflow-timeline-step-marker': true }, part: 'marker', 'aria-hidden': 'true', children: String(index + 1) }),
        q.span({ id: labelId, class: { 'gluon-workflow-timeline-step-title': true }, part: 'label', children: step.label }),
        q.span({ id: statusId, class: { 'gluon-workflow-timeline-step-meta': true }, part: 'status', children: `${statusText(step.status)} · ${stepText(index + 1)}${step.role ? ` · ${step.role}` : ''}` }),
        step.description ? q.p({ id: descriptionId, part: 'description', children: step.description }) : nothing,
        step.evidence ? q.p({ class: { 'gluon-workflow-timeline-evidence': true }, part: 'evidence', children: `${m.evidence}: ${step.evidence}` }) : nothing,
        step.action || step.link ? q.div({ class: { 'gluon-workflow-timeline-actions': true }, part: 'actions', children: [step.action ?? nothing, step.link ?? nothing] }) : nothing,
      ] }),
    ] });
  }) : [];
  const stateMessage = effectiveState === 'loading' ? m.loading : effectiveState === 'empty' ? m.empty : effectiveState === 'invalid' ? m.invalid : undefined;
  return q.section({ ...attributes, id: rootId, part: 'root', class: [{ gluon: true, organism: true, 'gluon-workflow-timeline': true }, attributes.class], 'data-state': effectiveState, 'aria-label': attributes['aria-label'] ?? m.timeline, 'aria-describedby': summaryId, children: [
    q.p({ id: summaryId, class: { 'gluon-workflow-timeline-summary': true }, part: 'summary', children: summary }),
    stateMessage ? q.p({ part: 'state-message', children: stateMessage }) : q.ol({ class: { 'gluon-workflow-timeline-list': true }, part: 'list', style: { '--gluon-workflow-timeline-count': String(Math.max(steps.length, 1)) }, children: list }),
    nextAction ? q.p({ class: { 'gluon-workflow-timeline-next': true }, part: 'next-action', children: [q.strong({ children: `${nextActionLabel ?? m.nextAction}: ` }), nextAction] }) : nothing,
    role ? q.p({ class: { 'gluon-workflow-timeline-role': true }, part: 'role', children: `${m.responsibleRole}: ${role}` }) : nothing,
    evidence ? q.p({ class: { 'gluon-workflow-timeline-evidence': true }, part: 'evidence', children: `${m.evidence}: ${evidence}` }) : nothing,
  ] });
}

export const WorkflowTimeline = defineOrganism(renderWorkflowTimeline, 'WorkflowTimeline', [workflowTimelineStyleDependency]);
