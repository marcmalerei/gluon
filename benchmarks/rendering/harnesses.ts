import {
  html as gluonHtml,
  render as gluonRender,
  repeat as gluonRepeat,
  unmount as gluonUnmount,
} from '@gluonjs/core';
import { html as litHtml, nothing as litNothing, render as litRender } from 'lit';
import { repeat as litRepeat } from 'lit/directives/repeat.js';
import { h as vueH, render as vueRender } from 'vue';

export const BENCHMARK_ROW_COUNT = 1_000;
export const benchmarkFrameworks = ['gluon', 'lit', 'vue', 'vanilla'] as const;
export const benchmarkScenarios = ['text', 'create', 'update', 'reverse'] as const;

export type BenchmarkFramework = typeof benchmarkFrameworks[number];
export type BenchmarkScenario = typeof benchmarkScenarios[number];

interface BenchmarkRow {
  readonly id: number;
  readonly label: string;
}

export interface HarnessSnapshot {
  readonly count: number;
  readonly firstId: string | null;
  readonly firstLabel: string | null;
  readonly lastId: string | null;
  readonly lastLabel: string | null;
}

export interface RenderingHarness {
  run(): void;
  snapshot(): HarnessSnapshot;
  dispose(): void;
}

const forwardRows = createRows('A');
const updatedRows = createRows('B');
const reversedRows = [...forwardRows].reverse();

export function createRenderingHarness(
  framework: BenchmarkFramework,
  scenario: BenchmarkScenario,
): RenderingHarness {
  if (scenario === 'text') return createTextUpdateHarness(framework);
  if (scenario === 'create') return createInitialRenderHarness(framework);
  if (framework === 'vanilla') return createVanillaUpdateHarness(scenario);
  return createFrameworkUpdateHarness(framework, scenario);
}

function createTextUpdateHarness(framework: BenchmarkFramework): RenderingHarness {
  const root = document.createElement('div');
  let alternate = false;
  if (framework === 'vanilla') {
    const paragraph = createParagraph({ id: 0, label: 'Row 0 A' });
    const main = document.createElement('main');
    main.append(paragraph);
    root.append(main);
    return {
      run() {
        alternate = !alternate;
        paragraph.textContent = alternate ? 'Row 0 B' : 'Row 0 A';
      },
      snapshot: () => readSnapshot(root),
      dispose: () => root.replaceChildren(),
    };
  }
  renderText(framework, root, 'Row 0 A');
  return {
    run() {
      alternate = !alternate;
      renderText(framework, root, alternate ? 'Row 0 B' : 'Row 0 A');
    },
    snapshot: () => readSnapshot(root),
    dispose: () => disposeFramework(framework, root),
  };
}

function createInitialRenderHarness(framework: BenchmarkFramework): RenderingHarness {
  let root = document.createElement('div');
  if (framework === 'vanilla') renderVanillaInitial(root, forwardRows);
  else renderFramework(framework, root, forwardRows);
  return {
    run() {
      root = document.createElement('div');
      if (framework === 'vanilla') renderVanillaInitial(root, forwardRows);
      else renderFramework(framework, root, forwardRows);
    },
    snapshot: () => readSnapshot(root),
    dispose: () => disposeFramework(framework, root),
  };
}

function createFrameworkUpdateHarness(
  framework: Exclude<BenchmarkFramework, 'vanilla'>,
  scenario: Exclude<BenchmarkScenario, 'create'>,
): RenderingHarness {
  const root = document.createElement('div');
  let alternate = false;
  renderFramework(framework, root, forwardRows);
  return {
    run() {
      alternate = !alternate;
      const rows = scenario === 'update'
        ? alternate ? updatedRows : forwardRows
        : alternate ? reversedRows : forwardRows;
      renderFramework(framework, root, rows);
    },
    snapshot: () => readSnapshot(root),
    dispose: () => disposeFramework(framework, root),
  };
}

function createVanillaUpdateHarness(
  scenario: Exclude<BenchmarkScenario, 'create'>,
): RenderingHarness {
  const root = document.createElement('div');
  const main = document.createElement('main');
  const nodes = new Map<number, HTMLParagraphElement>();
  root.append(main);
  for (const row of forwardRows) {
    const paragraph = createParagraph(row);
    nodes.set(row.id, paragraph);
    main.append(paragraph);
  }
  let alternate = false;
  return {
    run() {
      alternate = !alternate;
      const rows = scenario === 'update'
        ? alternate ? updatedRows : forwardRows
        : alternate ? reversedRows : forwardRows;
      if (scenario === 'update') {
        for (const row of rows) {
          const paragraph = nodes.get(row.id)!;
          paragraph.textContent = row.label;
        }
      } else {
        main.append(...rows.map((row) => nodes.get(row.id)!));
      }
    },
    snapshot: () => readSnapshot(root),
    dispose: () => root.replaceChildren(),
  };
}

function renderFramework(
  framework: Exclude<BenchmarkFramework, 'vanilla'>,
  root: HTMLElement,
  rows: readonly BenchmarkRow[],
): void {
  if (framework === 'gluon') {
    gluonRender(gluonHtml`<main>${gluonRepeat(
      rows,
      (row) => row.id,
      (row) => gluonHtml`<p data-id=${row.id}>${row.label}</p>`,
    )}</main>`, root);
    return;
  }
  if (framework === 'lit') {
    litRender(litHtml`<main>${litRepeat(
      rows,
      (row) => row.id,
      (row) => litHtml`<p data-id=${row.id}>${row.label}</p>`,
    )}</main>`, root);
    return;
  }
  vueRender(vueH('main', null, rows.map((row) => vueH(
    'p',
    { key: row.id, 'data-id': String(row.id) },
    row.label,
  ))), root);
}

function renderText(framework: BenchmarkFramework, root: HTMLElement, label: string): void {
  if (framework === 'gluon') {
    gluonRender(gluonHtml`<main><p data-id="0">${label}</p></main>`, root);
    return;
  }
  if (framework === 'lit') {
    litRender(litHtml`<main><p data-id="0">${label}</p></main>`, root);
    return;
  }
  if (framework === 'vue') {
    vueRender(vueH('main', null, [vueH('p', { 'data-id': '0' }, label)]), root);
    return;
  }
  throw new Error(`Unsupported framework ${framework}.`);
}

function renderVanillaInitial(root: HTMLElement, rows: readonly BenchmarkRow[]): void {
  const main = document.createElement('main');
  const fragment = document.createDocumentFragment();
  for (const row of rows) fragment.append(createParagraph(row));
  main.append(fragment);
  root.append(main);
}

function createParagraph(row: BenchmarkRow): HTMLParagraphElement {
  const paragraph = document.createElement('p');
  paragraph.dataset.id = String(row.id);
  paragraph.textContent = row.label;
  return paragraph;
}

function disposeFramework(framework: BenchmarkFramework, root: HTMLElement): void {
  if (framework === 'gluon') gluonUnmount(root);
  else if (framework === 'lit') litRender(litNothing, root);
  else if (framework === 'vue') vueRender(null, root);
  root.replaceChildren();
}

function readSnapshot(root: HTMLElement): HarnessSnapshot {
  const main = root.querySelector('main');
  const children = main ? [...main.children] as HTMLParagraphElement[] : [];
  const first = children[0];
  const last = children[children.length - 1];
  return {
    count: children.length,
    firstId: first?.dataset.id ?? null,
    firstLabel: first?.textContent ?? null,
    lastId: last?.dataset.id ?? null,
    lastLabel: last?.textContent ?? null,
  };
}

function createRows(suffix: string): BenchmarkRow[] {
  return Array.from({ length: BENCHMARK_ROW_COUNT }, (_, id) => ({
    id,
    label: `Row ${id} ${suffix}`,
  }));
}
