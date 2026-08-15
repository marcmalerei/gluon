import { createApp, html } from '@gluonjs/core';
import {
  DevtoolsProtocol,
  toDevtoolsSourceLocation,
  type DevtoolsSnapshot,
  type DevtoolsSourceLocation,
  type DevtoolsSourceLocationInput,
} from '../packages/devtools-api/dist/index.js';
import {
  createDevtoolsArtifactContract,
  createDevtoolsBridge,
  gluonDevtoolsPlugin,
  mountGluonDevtools,
  type DevtoolsArtifactContract,
  type DevtoolsInspectorOptions,
} from '../packages/devtools/dist/index.js';

const protocol = new DevtoolsProtocol();
const snapshot: DevtoolsSnapshot = protocol.snapshot();
void snapshot;
const bridge = createDevtoolsBridge({ enabled: false });
const app = createApp(() => html`<p>Devtools</p>`);
bridge.registerApplication({ id: 'typed', app, root: document.body });
bridge.recordScheduler('typed', { phase: 'update' });
gluonDevtoolsPlugin({ virtualId: 'virtual:typed-devtools' });
const sourceInput = { kind: 'component', file: '/private/component.ts', line: 3 } satisfies DevtoolsSourceLocationInput;
const source: DevtoolsSourceLocation | undefined = toDevtoolsSourceLocation(sourceInput);
const inspectorOptions = {
  navigateToSource: (location: DevtoolsSourceLocation) => console.log(location.file),
} satisfies DevtoolsInspectorOptions;
const artifact: DevtoolsArtifactContract = createDevtoolsArtifactContract();
const mounted = mountGluonDevtools(bridge, document.body, inspectorOptions);
void source;
void artifact;
mounted.unmount();
