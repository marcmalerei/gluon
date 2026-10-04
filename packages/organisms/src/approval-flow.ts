import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { approvalFlowStyleDependency } from './approval-flow-styles.js';

export type ApprovalFlowAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id'>;
export type ApprovalFlowChangeEvent = KeyboardEvent | MouseEvent;
export type ApprovalFlowStageStatus = 'pending' | 'in-review' | 'approved' | 'rejected' | 'changes-requested';
export interface ApprovalFlowStage { readonly id: string; readonly label: string; readonly status: ApprovalFlowStageStatus; readonly content: TemplateValue; readonly role?: string; readonly evidence?: TemplateValue; readonly actions?: TemplateValue; }
export interface ApprovalFlowProps {
  readonly id: string; readonly stages: readonly ApprovalFlowStage[]; readonly currentStage?: number; readonly title?: TemplateValue;
  readonly navigationLabel?: string; readonly statusLabel?: string; readonly attributes?: ApprovalFlowAttributes;
  readonly onStageChange?: (stage: number, event: ApprovalFlowChangeEvent) => void;
}

function safeId(value: string): string { return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'approval-flow-invalid'; }
function validFlow(id: string, stages: readonly ApprovalFlowStage[], currentStage: number): boolean {
  return Boolean(id.trim()) && !/\s/u.test(id) && stages.length > 0 && Number.isInteger(currentStage) && currentStage >= 0 && currentStage < stages.length
    && new Set(stages.map((stage) => stage.id)).size === stages.length
    && stages.every((stage) => Boolean(stage.id.trim()) && Boolean(stage.label.trim()) && ['pending', 'in-review', 'approved', 'rejected', 'changes-requested'].includes(stage.status));
}
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }

function renderApprovalFlow({ id, stages, currentStage = 0, title, navigationLabel = 'Approval stages', statusLabel = 'Approval status', attributes = {}, onStageChange }: ApprovalFlowProps): TemplateResult {
  assertNonEmpty('ApprovalFlow.navigationLabel', navigationLabel); assertNonEmpty('ApprovalFlow.statusLabel', statusLabel);
  const valid = validFlow(id, stages, currentStage); const rootId = valid ? id : safeId(id); const active = valid ? stages[currentStage] : undefined; const activeId = active ? `${rootId}-stage-${safeId(active.id)}` : `${rootId}-invalid-stage`;
  const { 'aria-label': ariaLabel, ...nativeAttributes } = attributes;
  const statusText = (status: ApprovalFlowStageStatus): string => status.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const change = (stage: number, event: MouseEvent): void => { if (valid && stage >= 0 && stage < stages.length && stage !== currentStage) onStageChange?.(stage, event); };
  const items = valid ? stages.map((stage, index) => q.li({ class: { 'gluon-approval-flow-stage': true, [`is-${stage.status}`]: true, 'is-current': index === currentStage }, 'data-status': stage.status, children: q.button({ id: `${rootId}-stage-${safeId(stage.id)}`, type: 'button', part: 'stage-button', 'aria-current': index === currentStage ? 'step' : undefined, onClick: (event: MouseEvent) => change(index, event), children: [q.span({ part: 'stage-label', children: stage.label }), q.small({ part: 'stage-status', children: statusText(stage.status) })] }) })) : [];
  return q.section({ ...nativeAttributes, id: rootId, part: 'root', class: [{ gluon: true, organism: true, 'gluon-approval-flow': true }, attributes.class], 'data-state': valid ? active?.status : 'invalid', 'aria-label': ariaLabel ?? 'Approval flow', children: [title ? q.header({ part: 'header', class: 'gluon-approval-flow-header', children: q.h2({ children: title }) }) : nothing, valid ? q.nav({ part: 'navigation', class: 'gluon-approval-flow-navigation', 'aria-label': navigationLabel, children: q.ol({ children: items }) }) : nothing, valid ? q.p({ part: 'status', class: 'gluon-approval-flow-status', 'aria-live': 'polite', children: `${statusLabel}: ${statusText(active?.status ?? 'pending')}` }) : q.p({ part: 'state-message', children: 'Approval state is unavailable' }), valid ? q.section({ part: 'content', class: 'gluon-approval-flow-content', 'aria-labelledby': activeId, children: [q.h3({ id: activeId, children: active?.label }), active?.role ? q.p({ part: 'role', children: `Role: ${active.role}` }) : nothing, active?.content ?? nothing, active?.evidence ? q.p({ part: 'evidence', children: [q.strong({ children: 'Evidence: ' }), active.evidence] }) : nothing, active?.actions ? q.div({ part: 'actions', children: active.actions }) : nothing] }) : nothing] });
}

export const ApprovalFlow = defineOrganism(renderApprovalFlow, 'ApprovalFlow', [approvalFlowStyleDependency]);
