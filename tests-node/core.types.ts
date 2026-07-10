import {
  html,
  repeat,
  type Key,
  type RepeatResult,
  type TemplateValue,
} from '@gluonjs/core';

interface Row {
  readonly id: string;
  readonly label: string;
}

const rows: readonly Row[] = [{ id: 'first', label: 'First' }];
const keyed: RepeatResult = repeat(
  rows,
  (row, index): Key => index === 0 ? row.id : index,
  (row, index): TemplateValue => html`<p data-index=${index}>${row.label}</p>`,
);

html`<section>${keyed}</section>`;

// @ts-expect-error keys cannot be null
repeat(rows, () => null, (row) => row.label);

// @ts-expect-error item renderers must return a TemplateValue
repeat(rows, (row) => row.id, () => new Date());
