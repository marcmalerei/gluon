import { Button, installUi } from '@gluonjs/atoms';
import { render } from '@gluonjs/core';

installUi(document, { theme: 'light' });
render(Button({ label: 'Continue' }), document.body);

document.addEventListener('gluon:load-card', () => { void import('./card.js'); });
document.addEventListener('gluon:load-shell', () => { void import('./shell.js'); });
