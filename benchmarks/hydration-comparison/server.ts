import { createSSRApp, h as vueH } from 'vue';
import { renderToString as vueRenderToString } from '@vue/server-renderer';
import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { renderRequest } from '@gluonjs/ssr';
import { createGluonApplication, litView, type HydrationState, vueView } from './shared.js';

export interface HydrationFixtures {
  readonly gluon: string;
  readonly lit: string;
  readonly vue: string;
}

export async function renderHydrationFixtures(): Promise<HydrationFixtures> {
  const gluonState: HydrationState = { selectedId: 0 };
  const gluonRequest = await renderRequest({
    url: '/catalog',
    createApp: () => createGluonApplication(gluonState, () => undefined),
  });

  const litState: HydrationState = { selectedId: 0 };
  const litMarkup = await collectResult(renderThunked(litView(litState, () => undefined)));

  const vueState: HydrationState = { selectedId: 0 };
  const vueMarkup = await vueRenderToString(createSSRApp(() => vueView(vueState, () => undefined)));

  return Object.freeze({
    gluon: gluonRequest.html,
    lit: litMarkup,
    vue: vueMarkup,
  });
}
