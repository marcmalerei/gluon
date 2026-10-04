import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { dataTableStyleDependency } from './data-table-styles.js';

export type DataTableAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };

export type DataTableState = 'ready' | 'loading' | 'empty';
export type DataTableSortDirection = 'ascending' | 'descending';
export type DataTableAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby'>;
};
export type DataTableTableAttributes = Omit<QuarkProps<HTMLTableElement>, 'children'>;

export interface DataTableColumn<Row> {
  readonly id: string;
  readonly header: TemplateValue;
  readonly cell: (row: Row, index: number) => TemplateValue;
  readonly sortable?: boolean;
  readonly sortDirection?: DataTableSortDirection;
  readonly ariaLabel?: string;
}

export interface DataTableRow<Row> {
  readonly id: string;
  readonly value: Row;
  readonly disabled?: boolean;
}

export type DataTableProps<Row> = DataTableAccessibleName & {
  readonly id: string;
  readonly columns: readonly DataTableColumn<Row>[];
  readonly rows: readonly DataTableRow<Row>[];
  readonly state?: DataTableState;
  readonly loadingContent?: TemplateValue;
  readonly emptyContent?: TemplateValue;
  readonly selectable?: boolean;
  readonly selectedRowIds?: readonly string[];
  readonly onSelectionChange?: (rowIds: readonly string[], event: Event) => void;
  readonly onSort?: (columnId: string, direction: DataTableSortDirection, event: Event) => void;
  readonly attributes?: DataTableAttributes;
  readonly tableAttributes?: DataTableTableAttributes;
};

function renderDataTable<Row>({
  id,
  label,
  labelledBy,
  columns,
  rows,
  state = rows.length > 0 ? 'ready' : 'empty',
  loadingContent = 'Loading rows…',
  emptyContent = 'No rows available.',
  selectable = false,
  selectedRowIds = [],
  onSelectionChange,
  onSort,
  attributes = {},
  tableAttributes = {},
}: DataTableProps<Row>): TemplateResult {
  if (!id.trim() || /\s/u.test(id)) throw new TypeError('DataTable.id must be a non-empty DOM id without whitespace.');
  if (columns.length === 0) throw new TypeError('DataTable.columns must contain at least one column.');
  const columnIds = new Set<string>();
  for (const column of columns) {
    if (!column.id.trim() || /\s/u.test(column.id)) throw new TypeError('DataTable column ids must be non-empty DOM ids without whitespace.');
    if (columnIds.has(column.id)) throw new TypeError(`DataTable column ids must be unique: ${column.id}`);
    columnIds.add(column.id);
  }
  const rowIds = new Set<string>();
  for (const row of rows) {
    if (!row.id.trim() || /\s/u.test(row.id)) throw new TypeError('DataTable row ids must be non-empty DOM ids without whitespace.');
    if (rowIds.has(row.id)) throw new TypeError(`DataTable row ids must be unique: ${row.id}`);
    rowIds.add(row.id);
  }
  const selected = new Set(selectedRowIds);
  const { aria, ...nativeAttributes } = attributes;
  const tableBody = state === 'loading'
    ? q.tbody({ children: q.tr({ children: q.td({ colspan: columns.length + (selectable ? 1 : 0), class: 'gluon-data-table-state', aria: { busy: true }, children: loadingContent }) }) })
    : state === 'empty' || rows.length === 0
      ? q.tbody({ children: q.tr({ children: q.td({ colspan: columns.length + (selectable ? 1 : 0), class: 'gluon-data-table-state', children: emptyContent }) }) })
      : q.tbody({ children: rows.map((row, rowIndex) => q.tr({
          class: [{ 'is-selected': selected.has(row.id), 'is-disabled': row.disabled }],
          data: { rowId: row.id },
          children: [
            selectable ? q.td({ class: 'gluon-data-table-selection-cell', children: q.input({
              type: 'checkbox',
              '?checked': selected.has(row.id),
              '?disabled': row.disabled,
              aria: { label: `Select row ${row.id}` },
              onChange: (event) => toggleRow(row.id, event, selected, onSelectionChange),
            }) }) : nothing,
            columns.map((column) => q.td({ 'data-column-id': column.id, children: column.cell(row.value, rowIndex) })),
          ],
        })), })
  const header = q.thead({ children: q.tr({ children: [
    selectable ? q.th({ scope: 'col', class: 'gluon-data-table-selection-cell', children: nothing }) : nothing,
    columns.map((column) => q.th({
      scope: 'col',
      aria: column.sortable ? { sort: column.sortDirection ?? 'none' } : undefined,
      children: column.sortable
        ? q.button({
            type: 'button',
            class: 'gluon-data-table-sort',
            aria: { label: column.ariaLabel },
            children: column.header,
            onClick: (event) => onSort?.(column.id, nextSortDirection(column.sortDirection), event),
          })
        : column.header,
    })),
  ] }) });
  return q.div({
    ...nativeAttributes,
    id,
    role: 'region',
    class: [{ gluon: true, molecule: true, 'gluon-data-table': true, [`is-${state}`]: true }, attributes.class],
    data: { ...attributes.data, state, selectable },
    aria: { ...aria, label, labelledby: labelledBy },
    children: q.div({ class: 'gluon-data-table-viewport', children: q.table({
      ...tableAttributes,
      class: [{ 'gluon-data-table-table': true }, tableAttributes.class],
      children: [header, tableBody],
    }) }),
  });
}

function nextSortDirection(direction: DataTableSortDirection | undefined): DataTableSortDirection {
  return direction === 'ascending' ? 'descending' : 'ascending';
}

function toggleRow(
  rowId: string,
  event: Event,
  selected: ReadonlySet<string>,
  onSelectionChange: DataTableProps<unknown>['onSelectionChange'],
): void {
  const next = new Set(selected);
  if ((event.currentTarget as HTMLInputElement).checked) next.add(rowId);
  else next.delete(rowId);
  onSelectionChange?.([...next], event);
}

const dataTableComponent = defineMolecule(
  renderDataTable as (props: DataTableProps<unknown>) => TemplateResult,
  'DataTable',
  [dataTableStyleDependency],
);

export const DataTable = Object.assign(
  <Row>(props: DataTableProps<Row>) => dataTableComponent(props as DataTableProps<unknown>),
  {
    layer: dataTableComponent.layer,
    displayName: dataTableComponent.displayName,
    styles: dataTableComponent.styles,
  },
);
