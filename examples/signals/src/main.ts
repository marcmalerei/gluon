import { createSignalsExample } from './app.js';
import { signalsExampleStyles } from './styles.js';

document.adoptedStyleSheets = [...document.adoptedStyleSheets, signalsExampleStyles];
const root = document.querySelector('#app');
if (!root) throw new Error('Signals example root is missing.');
createSignalsExample().app.mount(root);
