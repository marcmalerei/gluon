import { createApp, html } from '@gluonjs/core';
import { DevtoolsProtocol, type DevtoolsSnapshot } from '../packages/devtools-api/dist/index.js';
import { createDevtoolsBridge, gluonDevtoolsPlugin } from '../packages/devtools/dist/index.js';

const protocol = new DevtoolsProtocol();
const snapshot: DevtoolsSnapshot = protocol.snapshot();
void snapshot;
const bridge = createDevtoolsBridge({ enabled: false });
const app = createApp(() => html`<p>Devtools</p>`);
bridge.registerApplication({ id: 'typed', app, root: document.body });
bridge.recordScheduler('typed', { phase: 'update' });
gluonDevtoolsPlugin({ virtualId: 'virtual:typed-devtools' });
