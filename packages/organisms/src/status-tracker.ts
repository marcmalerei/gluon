import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { statusTrackerStyleDependency } from './status-tracker-styles.js';

export type StatusTrackerAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id'>;
export type StatusTrackerStatus = 'pending' | 'in-progress' | 'success' | 'warning' | 'error' | 'paused';
export interface StatusTrackerItem {
  readonly id: string;
  readonly label: string;
  readonly status: StatusTrackerStatus;
  readonly description?: string;
  readonly progress?: number;
  readonly timestamp?: string;
  readonly meta?: TemplateValue;
  readonly action?: TemplateValue;
}
export interface StatusTrackerProps {
  readonly id: string;
  readonly items: readonly StatusTrackerItem[];
  readonly currentId?: string;
  readonly title?: TemplateValue;
  readonly summary?: TemplateValue;
  readonly statusLabel?: string;
  readonly itemLabel?: string;
  readonly attributes?: StatusTrackerAttributes;
}

function safeId(value: string): string { return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'status-tracker-invalid'; }
function validStatus(status: string): status is StatusTrackerStatus { return ['pending', 'in-progress', 'success', 'warning', 'error', 'paused'].includes(status); }
function validTracker(id: string, items: readonly StatusTrackerItem[], currentId?: string): boolean {
  return Boolean(id.trim()) && !/\s/u.test(id) && items.length > 0 && new Set(items.map((item) => item.id)).size === items.length
    && (!currentId || items.some((item) => item.id === currentId))
    && items.every((item) => Boolean(item.id.trim()) && Boolean(item.label.trim()) && validStatus(item.status)
      && (item.progress === undefined || (Number.isFinite(item.progress) && item.progress >= 0 && item.progress <= 100))
      && (item.timestamp === undefined || Boolean(item.timestamp.trim())));
}
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function statusText(status: StatusTrackerStatus): string { return status.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function renderStatusTracker({ id, items, currentId, title, summary, statusLabel = 'Status', itemLabel = 'Tracked statuses', attributes = {} }: StatusTrackerProps): TemplateResult {
  assertNonEmpty('StatusTracker.statusLabel', statusLabel); assertNonEmpty('StatusTracker.itemLabel', itemLabel);
  const valid = validTracker(id, items, currentId);
  const rootId = valid ? id : safeId(id);
  const active = valid ? items.find((item) => item.id === currentId) ?? items.find((item) => item.status === 'in-progress') ?? items[0] : undefined;
  const activeStatus = active?.status;
  const { 'aria-label': ariaLabel, ...nativeAttributes } = attributes;
  const list = valid ? items.map((item, index) => {
    const itemId = `${rootId}-item-${safeId(item.id)}`;
    const labelId = `${itemId}-label`;
    const current = item.id === active?.id;
    return q.li({ id: itemId, part: 'item', class: { 'gluon-status-tracker-item': true, [`is-${item.status}`]: true }, 'data-status': item.status, 'aria-current': current ? 'step' : undefined, 'aria-labelledby': labelId, children: q.div({ part: 'item-content', class: 'gluon-status-tracker-item-content', children: [
      q.span({ part: 'marker', class: 'gluon-status-tracker-marker', 'aria-hidden': 'true', children: String(index + 1) }),
      q.div({ part: 'details', class: 'gluon-status-tracker-item-details', children: [
        q.h3({ id: labelId, part: 'label', class: 'gluon-status-tracker-item-title', children: item.label }),
        q.span({ part: 'status', class: 'gluon-status-tracker-item-meta', children: `${statusLabel}: ${statusText(item.status)}` }),
        item.description ? q.p({ part: 'description', class: 'gluon-status-tracker-item-description', children: item.description }) : nothing,
        item.progress === undefined ? nothing : q.meter({ part: 'progress', class: 'gluon-status-tracker-progress', min: 0, max: 100, value: item.progress, 'aria-label': `${item.label} progress`, children: `${item.progress}%` }),
        item.timestamp ? q.time({ part: 'timestamp', class: 'gluon-status-tracker-item-meta', dateTime: item.timestamp, children: item.timestamp }) : nothing,
        item.meta ?? nothing,
        item.action ? q.div({ part: 'actions', class: 'gluon-status-tracker-actions', children: item.action }) : nothing,
      ] }),
    ] }) });
  }) : [];
  return q.section({ ...nativeAttributes, id: rootId, part: 'root', class: [{ gluon: true, organism: true, 'gluon-status-tracker': true }, attributes.class], 'data-state': valid ? activeStatus : 'invalid', 'aria-label': ariaLabel ?? 'Status tracker', children: [
    title ? q.header({ part: 'header', children: q.h2({ children: title }) }) : nothing,
    summary ? q.p({ part: 'summary', class: 'gluon-status-tracker-summary', 'aria-live': 'polite', children: summary }) : nothing,
    valid ? q.ol({ part: 'list', class: 'gluon-status-tracker-list', 'aria-label': itemLabel, children: list }) : q.p({ part: 'state-message', children: 'Status tracker state is unavailable' }),
  ] });
}

export const StatusTracker = defineOrganism(renderStatusTracker, 'StatusTracker', [statusTrackerStyleDependency]);
