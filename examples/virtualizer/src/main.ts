import { createVirtualizerExample } from './app.js';
import { virtualizerExampleStyles } from './styles.js';

document.adoptedStyleSheets = [...document.adoptedStyleSheets, virtualizerExampleStyles];
const root = document.querySelector('#app');
if (!root) throw new Error('Virtualizer example root is missing.');
createVirtualizerExample().app.mount(root);
