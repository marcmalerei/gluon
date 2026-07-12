import { html } from '@gluonjs/core';
import type { RouteRecordRaw } from '@gluonjs/router';

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => html`<h1>Built with Gluon</h1><p>Start in <code>src/app.ts</code>.</p>`,
  },
  {
    path: '/about',
    name: 'about',
    component: () => html`<h1>About</h1><p>This route uses the public Gluon Router API.</p>`,
  },
];
