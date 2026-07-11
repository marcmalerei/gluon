import { createApp, html } from '@gluonjs/core';
import { createRouter, createRouterPlugin, createWebHistory, RouterView } from '@gluonjs/router';
import { createStoreManager, defineStore } from '@gluonjs/store';

const counter = defineStore('counter', () => ({ count: 0 }), {
  actions: (store) => ({ increment: () => { store.count += 1; } }),
});
const stores = createStoreManager();
const state = counter.use(stores);
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: () => html`<button @click=${state.increment}>${state.count}</button>` }],
});

await router.isReady();
const app = createApp(() => html`<main>${RouterView()}</main>`);
app.use(createRouterPlugin(router));
app.onUnmounted(() => stores.dispose());
app.mount(document.querySelector('#app')!);
