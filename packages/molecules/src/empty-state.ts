import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { emptyStateStyleDependency } from './empty-state-styles.js';

export type EmptyStatePresentation = 'compact' | 'full';
export type EmptyStateHeadingLevel = 2 | 3 | 4 | 5 | 6;
export type EmptyStateAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'live' | 'atomic'>;
};

export interface EmptyStateProps {
  readonly heading?: TemplateValue;
  readonly headingLevel?: EmptyStateHeadingLevel;
  readonly children?: TemplateValue;
  readonly illustration?: TemplateValue;
  readonly action?: TemplateValue;
  readonly presentation?: EmptyStatePresentation;
  readonly attributes?: EmptyStateAttributes;
}

function renderEmptyState({
  heading,
  headingLevel = 2,
  children,
  illustration,
  action,
  presentation = 'full',
  attributes = {},
}: EmptyStateProps): TemplateResult {
  return q.div({
    ...attributes,
    class: [{ gluon: true, molecule: true, 'gluon-empty-state': true, [`is-${presentation}`]: true }, attributes.class],
    data: { ...attributes.data, presentation },
    children: [
      illustration === undefined ? undefined : q.div({ class: 'gluon-empty-state-media', children: illustration }),
      heading === undefined ? undefined : q.div({ role: 'heading', aria: { level: headingLevel }, class: 'gluon-empty-state-heading', children: heading }),
      children === undefined ? undefined : q.div({ class: 'gluon-empty-state-body', children }),
      action === undefined ? undefined : q.div({ class: 'gluon-empty-state-action', children: action }),
    ],
  });
}

export const EmptyState = defineMolecule(renderEmptyState, 'EmptyState', [emptyStateStyleDependency]);
