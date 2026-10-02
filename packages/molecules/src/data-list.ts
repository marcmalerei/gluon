import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { dataListStyleDependency } from './data-list-styles.js';

export interface DataListItem {
  readonly id: string;
  readonly label: TemplateValue;
  readonly value: TemplateValue;
  readonly description?: TemplateValue;
}

export type DataListAttributes = Omit<QuarkProps<HTMLDListElement>, 'children' | 'id'>;

export interface DataListProps {
  readonly id: string;
  readonly items: readonly DataListItem[];
  readonly columns?: 1 | 2 | 3 | 4;
  readonly attributes?: DataListAttributes;
}

function renderDataList({ id, items, columns = 2, attributes = {} }: DataListProps): TemplateResult {
  if (!id.trim() || /\s/u.test(id)) throw new TypeError('DataList.id must be a non-empty DOM id without whitespace.');
  const seen = new Set<string>();
  const children = items.flatMap((item) => {
    if (!item.id.trim() || /\s/u.test(item.id)) throw new TypeError('DataList item ids must be non-empty DOM ids without whitespace.');
    if (seen.has(item.id)) throw new TypeError(`DataList item ids must be unique: ${item.id}`);
    seen.add(item.id);
    const descriptionId = item.description === undefined ? undefined : `${id}-${item.id}-description`;
    return [
      q.dt({ id: `${id}-${item.id}-label`, class: 'gluon-data-list-label', children: item.label }),
      q.dd({ id: `${id}-${item.id}-value`, class: 'gluon-data-list-value', 'aria-describedby': descriptionId, children: [item.value, item.description === undefined ? nothing : q.span({ id: descriptionId, class: 'gluon-data-list-description', children: item.description })] }),
    ];
  });
  return q.dl({ ...attributes, id, class: [{ gluon: true, molecule: true, 'gluon-data-list': true, [`is-${columns}-columns`]: true }, attributes.class], children });
}

export const DataList = defineMolecule(renderDataList, 'DataList', [dataListStyleDependency]);
