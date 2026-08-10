import { defineAtom, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { statusBadgeStyleDependency } from './status-badge-styles.js';

export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type StatusBadgeAttributes = Omit<QuarkProps<HTMLSpanElement>, 'children'>;

export interface StatusBadgeProps {
  readonly children: TemplateValue;
  readonly tone?: StatusBadgeTone;
  readonly attributes?: StatusBadgeAttributes;
}

function renderStatusBadge({
  children,
  tone = 'neutral',
  attributes = {},
}: StatusBadgeProps): TemplateResult {
  return q.span({
    ...attributes,
    class: [
      { gluon: true, atom: true, 'gluon-status-badge': true, [`is-${tone}`]: true },
      attributes.class,
    ],
    children,
  });
}

export const StatusBadge = defineAtom(
  renderStatusBadge,
  'StatusBadge',
  [statusBadgeStyleDependency],
);
