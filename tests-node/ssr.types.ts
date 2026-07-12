import { GluonElement, createApp, createComponentStyleSelection, defineElement, html } from '@gluonjs/core';
import { defineStore } from '@gluonjs/store';
import {
  prepareForHydration,
  createStyleManifest,
  renderProgressively,
  renderElement,
  renderRequest,
  renderToString,
  serializeSsrState,
  type SsrRequestResult,
} from '../packages/ssr/dist/index.js';
import { hydrateApplication, hydrateTemplate } from '../packages/ssr/dist/hydration.js';
import { renderProgressiveReadableStream, renderToReadableStream } from '../packages/ssr/dist/streaming.js';
import { generateStaticSite } from '../packages/ssr/dist/static.js';

class GreetingElement extends GluonElement {
  static override readonly properties = { name: String };
  declare name: string;
  protected override render() { return html`<p>${this.name}</p>`; }
}
defineElement('typed-greeting', GreetingElement);
void renderToString(renderElement(GreetingElement, { properties: { name: 'Ada' } }));
const stream: ReadableStream<Uint8Array> = renderToReadableStream(html`<p>Stream</p>`);
void stream;
const progressive: ReadableStream<Uint8Array> = renderProgressiveReadableStream(html`<p>Stream</p>`);
void progressive;
void renderProgressively(html`<p>Async</p>`);
void prepareForHydration(html`<p>Hydrate</p>`);
const hydrationRoot = document.createElement('div');
const hydrationValue = html`<p>Hydrate</p>`;
void hydrateTemplate(hydrationValue, hydrationRoot, {
  recovery: 'throw',
  styleSelection: createComponentStyleSelection(hydrationValue),
});
void hydrateApplication(createApp(() => html`<p>App</p>`), hydrationRoot);

const counter = defineStore({ id: 'typed-request', state: () => ({ count: 0 }) });
const request: Promise<SsrRequestResult> = renderRequest<{ path: string }>({
  url: '/reports/1',
  routes: (manager) => {
    counter.use(manager).count += 1;
    return [{ path: '/reports/:id', name: 'report' }];
  },
  load: async ({ router }) => ({ path: router.currentRoute.value.path }),
  createApp: ({ data, store }) => createApp(() => html`${data.path}:${counter.use(store).count}`),
});
void request;
serializeSsrState({ ready: true });
createStyleManifest([]);
createStyleManifest({
  version: 1,
  entries: [{ id: 'app', scope: 'example', sheet: new CSSStyleSheet() }],
});
void generateStaticSite({
  routes: ['/'],
  outputDirectory: 'dist-static',
  assets: { entry: '/assets/app.js' },
  render: async () => request,
});

// @ts-expect-error url is required for request ownership
renderRequest({ createApp: () => createApp(() => html`Missing URL`) });
// @ts-expect-error createApp must return a Gluon application
renderRequest({ url: '/', createApp: () => html`Not an app` });
