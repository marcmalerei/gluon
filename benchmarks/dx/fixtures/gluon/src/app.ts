import { compose, createApp, html, type GluonApp } from '@gluonjs/core';
import { Button } from '@gluonjs/atoms';
import { RouterLink, RouterView, createRouterPlugin, type Router } from '@gluonjs/router';
import { createStoreManager, type StoreManager } from '@gluonjs/store';
import { useCounterStore, type CounterStore } from './counter-store.js';

export interface StarterApplicationOptions {
  readonly router: Router;
  readonly storeManager?: StoreManager;
}

export interface StarterApplication {
  readonly app: GluonApp;
  readonly storeManager: StoreManager;
  readonly counter: CounterStore;
}

export function createStarterApplication(options: StarterApplicationOptions): StarterApplication {
  const ownsStoreManager = options.storeManager === undefined;
  const storeManager = options.storeManager ?? createStoreManager();
  const counter = useCounterStore.use(storeManager);
  const app = createApp(() => html`
    <header>
      <a class="brand" href="/">Gluon Starter</a>
      <nav aria-label="Primary">
        ${compose(RouterLink, { to: '/' })`Home`}
        ${compose(RouterLink, { to: '/about' })`About`}
      </nav>
    </header>
    <main>
      ${RouterView()}
      ${Button({
          label: `Count: ${counter.count}`,
          onClick: () => counter.increment(),
          attributes: { 'aria-label': 'Increment counter' },
        })}
    </main>
  `);
  app.use(createRouterPlugin(options.router));
  if (ownsStoreManager) app.onUnmounted(() => storeManager.dispose());
  return { app, storeManager, counter };
}
