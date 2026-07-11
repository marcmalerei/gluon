import { createApp, html } from '@gluonjs/core';
import { ref } from '@gluonjs/reactivity';

const count = ref(2);

createApp(() => html`
  <main>
    <h1>Count ${count.value}</h1>
    <button type="button" @click=${() => { count.value += 1; }}>Increment</button>
  </main>
`).mount(document.querySelector('#app')!);
