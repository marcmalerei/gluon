import { bench, describe } from 'vitest';
import { html, repeat, render } from '../src/index.js';

interface BenchmarkRow {
  readonly id: number;
  readonly label: string;
}

const SIZE = 1_000;

function createRows(): BenchmarkRow[] {
  return Array.from({ length: SIZE }, (_, id) => ({ id, label: `Row ${id}` }));
}

function createHarness() {
  const root = document.createElement('div');
  let rows = createRows();
  const view = () => html`<main>${repeat(
    rows,
    (item) => item.id,
    (item) => html`<p data-id=${item.id}>${item.label}</p>`,
  )}</main>`;
  render(view(), root);

  return {
    reverse(): void {
      rows = [...rows].reverse();
      render(view(), root);
    },
    rotate(): void {
      rows = [...rows.slice(100), ...rows.slice(0, 100)];
      render(view(), root);
    },
    replaceWindow(): void {
      const nextId = rows[rows.length - 1]!.id + 1;
      rows = [...rows.slice(100), ...Array.from(
        { length: 100 },
        (_, offset) => ({ id: nextId + offset, label: `Row ${nextId + offset}` }),
      )];
      render(view(), root);
    },
  };
}

describe(`keyed reconciliation (${SIZE.toLocaleString('en-US')} rows)`, () => {
  const reverseHarness = createHarness();
  const rotateHarness = createHarness();
  const replaceHarness = createHarness();

  bench('reverse all surviving rows', () => {
    reverseHarness.reverse();
  });

  bench('move the first 100 rows to the end', () => {
    rotateHarness.rotate();
  });

  bench('remove 100 rows and append 100 rows', () => {
    replaceHarness.replaceWindow();
  });
});
