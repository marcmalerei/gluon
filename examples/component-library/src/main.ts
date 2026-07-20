import { createApp, html } from '@gluonjs/core';
import { ProductBadge } from './library.js';

createApp(() => html`
  <section aria-labelledby="component-library-heading">
    <h1 id="component-library-heading">Packed library consumer</h1>
    <p>${ProductBadge('In stock')}</p>
    <example-product-picker value="1"></example-product-picker>
  </section>
`).mount(document.querySelector('#app')!);
