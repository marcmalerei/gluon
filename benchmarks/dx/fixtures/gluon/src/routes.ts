import { html } from '@gluonjs/core';
import type { RouteRecordRaw } from '@gluonjs/router';

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    name: 'product',
    component: () => html`<h1 data-product-title>Evidence Tote</h1>`,
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => html`<h1>Checkout</h1>`,
  },
];
