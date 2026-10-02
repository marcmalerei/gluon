import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { filterBarStyleDependency } from './filter-bar-styles.js';

export type FilterBarAttributes = Omit<QuarkProps<HTMLFormElement>, 'children' | 'id'>;

export interface FilterBarProps {
  readonly id: string;
  readonly label: string;
  readonly children: TemplateValue;
  readonly activeCount?: number;
  readonly clearAction?: TemplateValue;
  readonly summary?: TemplateValue;
  readonly attributes?: FilterBarAttributes;
}

function renderFilterBar({ id, label, children, activeCount, clearAction, summary, attributes = {} }: FilterBarProps): TemplateResult {
  if (!id.trim() || /\s/u.test(id)) throw new TypeError('FilterBar.id must be a non-empty DOM id without whitespace.');
  if (!label.trim()) throw new TypeError('FilterBar.label must be a non-empty string.');
  const active = activeCount === undefined ? undefined : Math.max(0, Math.floor(activeCount));
  const summaryId = summary === undefined ? undefined : `${id}-summary`;
  return q.form({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-filter-bar': true }, attributes.class],
    aria: { ...attributes.aria, label, describedby: summaryId },
    children: [
      q.div({ class: 'gluon-filter-bar-controls', children }),
      summary === undefined ? undefined : q.p({ id: summaryId, class: 'gluon-filter-bar-summary', role: 'status', aria: { live: 'polite', atomic: true }, children: summary }),
      active === undefined ? undefined : q.span({ class: 'gluon-filter-bar-count', children: `${active} active filter${active === 1 ? '' : 's'}` }),
      clearAction === undefined ? undefined : q.div({ class: 'gluon-filter-bar-clear', children: clearAction }),
    ],
  });
}

export const FilterBar = defineMolecule(renderFilterBar, 'FilterBar', [filterBarStyleDependency]);
