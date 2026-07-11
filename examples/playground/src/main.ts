import { adoptStyles } from '@gluonjs/core';
import { createPlaygroundApplication } from './app.js';
import { playgroundStyles } from './styles.js';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('Gluon Playground requires an #app mount element.');
adoptStyles(document, playgroundStyles);
createPlaygroundApplication().app.mount(container);
