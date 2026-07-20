import { html, render } from '@gluonjs/core';

let count = 0;
const root = document.querySelector('#app')!;
const update = (): void => render(html`<main><h1>Bundle fixture</h1><button type="button" aria-label="Increment" @click=${() => { count += 1; update(); }}>Increment</button><output aria-live="polite">${count}</output></main>`, root);
update();
