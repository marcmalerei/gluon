import { createApp as createVueApp, h, type App } from 'vue';
import { GluonCounter } from './custom-element.js';

export function mountVueHost(target: string | Element = '#vue-host'): App<Element> {
  if (!customElements.get('gluon-counter')) customElements.define('gluon-counter', GluonCounter);
  const app = createVueApp({
    render: () => h('gluon-counter', {
      count: 2,
      onChange: (event: CustomEvent<{ value: number }>) => console.log(event.detail.value),
    }),
  });
  app.mount(target);
  return app;
}

if (document.querySelector('#vue-host')) mountVueHost();
