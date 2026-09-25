import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { html as gluonHtml } from '@gluonjs/core';
import { renderToString as gluonRenderToString } from '@gluonjs/ssr';
import { renderToReadableStream } from '@gluonjs/ssr/streaming';
import { html as litHtml, renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { RenderResultReadable } from '@lit-labs/ssr/lib/render-result-readable.js';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString as vueRenderToString, renderToNodeStream as vueRenderToNodeStream } from '@vue/server-renderer';

export const frameworks = ['gluon', 'lit', 'vue'] as const;
export type Framework = typeof frameworks[number];
export const modes = ['string', 'stream'] as const;
export type Mode = typeof modes[number];

const rows = Object.freeze(Array.from({ length: 120 }, (_, id) => ({
  id,
  name: `Object ${String(id + 1).padStart(3, '0')}`,
  category: ['Lighting', 'Carry', 'Workspace', 'Seating'][id % 4],
})));

type Runner = () => Promise<string>;

const stringRunners: Record<Framework, Runner> = {
  gluon: async () => gluonRenderToString(gluonTemplate()),
  lit: async () => collectResult(renderThunked(litTemplate())),
  vue: async () => vueRenderToString(createSSRApp(() => vueTemplate())),
};

const streamRunners: Record<Framework, Runner> = {
  gluon: async () => collectWebStream(renderToReadableStream(gluonTemplate())),
  lit: async () => collectNodeStream(new RenderResultReadable(renderThunked(litTemplate()))),
  vue: async () => collectNodeStream(vueRenderToNodeStream(createSSRApp(() => vueTemplate()))),
};

export interface LoadConfig {
  readonly concurrency: number;
  readonly requests: number;
}

export interface RequestSample {
  readonly request: number;
  readonly durationMs: number;
  readonly outputBytes?: number;
  readonly outputSha256?: string;
  readonly error?: string;
}

export interface BatchResult {
  readonly framework: Framework;
  readonly mode: Mode;
  readonly concurrency: number;
  readonly requests: number;
  readonly wallDurationMs: number;
  readonly throughputRequestsPerSecond: number;
  readonly errors: number;
  readonly samples: readonly RequestSample[];
  readonly statistics: Statistics;
  readonly output: { readonly bytes: number; readonly sha256: string };
  readonly memory: MemoryObservation;
}

export interface MemoryObservation {
  readonly forcedGc: boolean;
  readonly before: NodeJS.MemoryUsage;
  readonly after: NodeJS.MemoryUsage;
}

export interface Statistics {
  readonly min: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly max: number;
}

export async function runLoadBatch(
  framework: Framework,
  mode: Mode,
  config: LoadConfig,
): Promise<BatchResult> {
  const runner = mode === 'string' ? stringRunners[framework] : streamRunners[framework];
  const before = observeMemory(true);
  const samples: RequestSample[] = [];
  let nextRequest = 0;
  const started = performance.now();
  const worker = async (): Promise<void> => {
    while (true) {
      const request = nextRequest++;
      if (request >= config.requests) return;
      const requestStarted = performance.now();
      try {
        const output = await runner();
        const durationMs = performance.now() - requestStarted;
        validateMarkup(framework, output);
        samples.push({
          request,
          durationMs,
          outputBytes: Buffer.byteLength(output),
          outputSha256: sha256(output),
        });
      } catch (error) {
        samples.push({
          request,
          durationMs: performance.now() - requestStarted,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(config.concurrency, config.requests) }, worker));
  const wallDurationMs = performance.now() - started;
  const after = observeMemory(true);
  const successful = samples.filter((sample) => sample.error === undefined);
  const outputBytes = successful[0]?.outputBytes ?? 0;
  const outputSha256 = successful[0]?.outputSha256 ?? '';
  if (successful.some((sample) => sample.outputBytes !== outputBytes || sample.outputSha256 !== outputSha256)) {
    throw new Error(`${framework} ${mode} produced non-deterministic output across requests.`);
  }
  return {
    framework,
    mode,
    concurrency: config.concurrency,
    requests: config.requests,
    wallDurationMs,
    throughputRequestsPerSecond: successful.length / (wallDurationMs / 1_000),
    errors: samples.length - successful.length,
    samples: samples.sort((left, right) => left.request - right.request),
    statistics: summarize(successful.map((sample) => sample.durationMs)),
    output: { bytes: outputBytes, sha256: outputSha256 },
    memory: { forcedGc: before.forcedGc && after.forcedGc, before: before.usage, after: after.usage },
  };
}

function observeMemory(force: boolean): { forcedGc: boolean; usage: NodeJS.MemoryUsage } {
  const collect = globalThis.gc;
  const forcedGc = force && typeof collect === 'function';
  if (forcedGc) collect();
  return { forcedGc, usage: process.memoryUsage() };
}

async function collectNodeStream(stream: AsyncIterable<Buffer | string>): Promise<string> {
  let output = '';
  for await (const chunk of stream) output += chunk.toString();
  return output;
}

async function collectWebStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = '';
  while (true) {
    const next = await reader.read();
    if (next.done) return output;
    output += decoder.decode(next.value, { stream: true });
  }
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

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function summarize(values: readonly number[]): Statistics {
  if (values.length === 0) return { min: 0, median: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...values].sort((left, right) => left - right);
  return {
    min: sorted[0]!,
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    p99: quantile(sorted, 0.99),
    max: sorted.at(-1)!,
  };
}

function quantile(sorted: readonly number[], probability: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * probability) - 1)]!;
}
