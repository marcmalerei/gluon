import { GluonCounter } from './custom-element.js';

if (!customElements.get('gluon-counter')) customElements.define('gluon-counter', GluonCounter);
