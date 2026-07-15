import { computed, signal } from '@preact/signals-core';
import { createApp, html, type GluonApp } from '@gluonjs/core';
import { Signal, fromStandardSignal } from '@gluonjs/reactivity/signals';
import { fromPreactSignal } from '@gluonjs/reactivity/preact-signals';

export interface SignalsExample {
  readonly app: GluonApp;
  readonly standardQuantity: InstanceType<typeof Signal.State<number>>;
  readonly preactQuantity: ReturnType<typeof signal<number>>;
}

export function createSignalsExample(): SignalsExample {
  const standardQuantity = new Signal.State(1);
  const standardTotal = new Signal.Computed(() => standardQuantity.get() * 48);
  const preactQuantity = signal(1);
  const preactTotal = computed(() => preactQuantity.value * 48);
  const standard = fromStandardSignal(standardTotal, { connect: true });
  const preact = fromPreactSignal(preactTotal, { connect: true });

  const app = createApp(() => html`
    <main>
      <p class="eyebrow">Runnable framework example</p>
      <h1>One cart, two external signal graphs.</h1>
      <section aria-labelledby="standard-heading">
        <h2 id="standard-heading">TC39 Signals polyfill</h2>
        <p aria-live="polite">${standardQuantity.get()} workshop lamp${standardQuantity.get() === 1 ? '' : 's'} · €${standard.value}</p>
        <button type="button" @click=${() => standardQuantity.set(standardQuantity.get() + 1)}>Add standard-signal lamp</button>
      </section>
      <section aria-labelledby="preact-heading">
        <h2 id="preact-heading">Preact Signals</h2>
        <p aria-live="polite">${preactQuantity.peek()} workshop lamp${preactQuantity.peek() === 1 ? '' : 's'} · €${preact.value}</p>
        <button type="button" @click=${() => { preactQuantity.value += 1; }}>Add Preact-signal lamp</button>
      </section>
    </main>
  `);
  app.use(() => () => {
    standard.disconnect();
    preact.disconnect();
  });
  return { app, standardQuantity, preactQuantity };
}
