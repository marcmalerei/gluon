import { html } from '@gluonjs/core';
import { renderToString, serializeSsrState } from '@gluonjs/ssr';

const state = { route: '/products/orbit-lamp', bag: [] };
const rendered = await renderToString(html`<main><h1>Orbit Lamp</h1></main>`);

export const responseBody = `<!doctype html>
<main id="app">${rendered}</main>
<script type="application/json" data-gluon-state>${serializeSsrState(state)}</script>`;
