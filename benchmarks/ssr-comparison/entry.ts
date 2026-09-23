import { performance } from 'node:perf_hooks';
import { html as gluonHtml } from '@gluonjs/core';
import { renderToString as gluonRenderToString } from '@gluonjs/ssr';
import { html as litHtml } from 'lit';
import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString as vueRenderToString } from '@vue/server-renderer';

const frameworks = ['gluon', 'lit', 'vue'] as const;
type Framework = typeof frameworks[number];
interface SsrCorrectness {
  readonly rowCount: number;
  readonly markupBytes: number;
  readonly firstRow: string;
  readonly lastRow: string;
}
interface Statistics {
  readonly min: number;
  readonly median: number;
  readonly p95: number;
  readonly max: number;
}
const rows = Object.freeze(Array.from({ length: 120 }, (_, id) => ({
  id,
  name: `Object ${String(id + 1).padStart(3, '0')}`,
  category: ['Lighting', 'Carry', 'Workspace', 'Seating'][id % 4],
})));

const runners: Record<Framework, () => Promise<string>> = {
  gluon: async () => gluonRenderToString(gluonTemplate()),
  lit: async () => collectResult(renderThunked(litTemplate())),
  vue: async () => vueRenderToString(createSSRApp(() => vueTemplate())),
};

export async function runSsrComparison(config: { samples: number; warmupRounds: number }) {
  const samples: Record<Framework, number[]> = { gluon: [], lit: [], vue: [] };
  const correctness: Partial<Record<Framework, SsrCorrectness>> = {};
  for (let round = 0; round < config.warmupRounds + config.samples; round += 1) {
    for (const framework of rotatedFrameworks(round)) {
      const started = performance.now();
      const markup = await runners[framework]();
      const durationMs = performance.now() - started;
      validateMarkup(framework, markup);
      if (round < config.warmupRounds) continue;
      samples[framework].push(durationMs);
      correctness[framework] = { rowCount: rows.length, markupBytes: Buffer.byteLength(markup), firstRow: '0', lastRow: '119' };
    }
  }
  return {
    schemaVersion: 1,
    workload: { rowCount: rows.length, output: 'complete HTML string' },
    correctness,
    results: frameworks.map((framework) => ({
      framework,
      samples: samples[framework],
      statistics: summarize(samples[framework]),
      markupBytes: correctness[framework]?.markupBytes,
    })),
  };
}

function gluonTemplate() {
  return gluonHtml`<main data-ssr-app><h1>Catalog</h1><section aria-label="Catalog"><ul>${rows.map((row) => gluonHtml`<li data-row=${row.id}><span>${row.name}</span><span>${row.category}</span></li>`)}</ul></section></main>`;
}

function litTemplate() {
  return litHtml`<main data-ssr-app><h1>Catalog</h1><section aria-label="Catalog"><ul>${rows.map((row) => litHtml`<li data-row=${row.id}><span>${row.name}</span><span>${row.category}</span></li>`)}</ul></section></main>`;
}

function vueTemplate() {
  return vueH('main', { 'data-ssr-app': '' }, [
    vueH('h1', null, 'Catalog'),
    vueH('section', { 'aria-label': 'Catalog' }, [
      vueH('ul', null, rows.map((row) => vueH('li', { 'data-row': String(row.id), key: row.id }, [
        vueH('span', null, row.name),
        vueH('span', null, row.category),
      ]))),
    ]),
  ]);
}

function validateMarkup(framework: Framework, markup: string): void {
  const rowCount = markup.match(/data-row=/g)?.length ?? 0;
  if (rowCount !== rows.length || !markup.includes('Catalog') || !markup.includes('data-row="119"')) {
    throw new Error(`${framework} SSR correctness failed: expected ${rows.length} rows, found ${rowCount}.`);
  }
}

function rotatedFrameworks(offset: number): readonly Framework[] {
  const start = offset % frameworks.length;
  return [...frameworks.slice(start), ...frameworks.slice(0, start)];
}

function summarize(values: readonly number[]): Statistics {
  const sorted = [...values].sort((left, right) => left - right);
  const min = sorted[0];
  const max = sorted.at(-1);
  if (min === undefined || max === undefined) {
    throw new Error('Cannot summarize an empty sample set.');
  }
  return { min, median: quantile(sorted, 0.5), p95: quantile(sorted, 0.95), max };
}

function quantile(sorted: readonly number[], probability: number): number {
  const value = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * probability) - 1)];
  if (value === undefined) {
    throw new Error('Cannot calculate a quantile for an empty sample set.');
  }
  return value;
}
