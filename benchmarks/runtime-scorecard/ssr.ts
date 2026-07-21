import { html } from '@gluonjs/core';
import { renderToString } from '@gluonjs/ssr';

export interface SsrScorecardConfig {
  readonly samples: number;
  readonly warmupRounds: number;
}

/** Runs the production-bundled, DOM-independent SSR scorecard lane. */
export async function runSsrScorecard(config: SsrScorecardConfig): Promise<{
  readonly metric: 'ssrRenderMs';
  readonly samples: readonly number[];
  readonly correctness: { readonly rowCount: 100; readonly markupBytes: number };
}> {
  const rows = Array.from({ length: 100 }, (_, index) => html`<li data-row=${index}>Product ${index}</li>`);
  const value = html`<main><h1>${'Catalog'}</h1><ul>${rows}</ul></main>`;
  const verify = async (): Promise<number> => {
    const rendered = await renderToString(value);
    const rowCount = rendered.match(/data-row=/g)?.length ?? 0;
    if (rowCount !== 100 || !rendered.includes('Catalog') || !rendered.includes('data-row="99"')) {
      throw new Error(`SSR correctness gate produced ${rowCount} rows.`);
    }
    return rendered.length;
  };
  const markupBytes = await verify();
  const samples: number[] = [];
  for (let round = 0; round < config.warmupRounds + config.samples; round += 1) {
    const started = performance.now();
    await verify();
    const duration = performance.now() - started;
    if (round >= config.warmupRounds) samples.push(duration);
  }
  return {
    metric: 'ssrRenderMs',
    samples,
    correctness: { rowCount: 100, markupBytes },
  };
}
