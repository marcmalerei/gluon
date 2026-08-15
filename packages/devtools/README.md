<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/devtools.png" alt="@gluonjs/devtools — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

Gluon Devtools is explicitly opt-in. `createDevtoolsBridge()` defaults to
`enabled: false`, installs no render hook, and exposes no global. Development
entry points enable it deliberately and register each application root with an
independent ID plus optional Router, Store, state, and context inspectors.
Source navigation is carried only through bounded, redacted location metadata;
production paths and excerpts are never surfaced. Pass `navigateToSource` to
`mountGluonDevtools()` when the application has an editor integration. Gluon
never constructs an editor URI, opens a remote connection, or navigates without
that callback.

## Inspect an application

```ts
import { createApp, html } from '@gluonjs/core';
import {
  createDevtoolsBridge,
  mountGluonDevtools,
} from '@gluonjs/devtools';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app');

const app = createApp(() => html`<main>GLUON GOODS</main>`);
app.mount(root);
const bridge = createDevtoolsBridge({ enabled: true, exposeGlobal: true });
const unregister = bridge.registerApplication({
  id: 'shop',
  name: 'GLUON GOODS',
  app,
  root,
  state: () => ({ bagCount: 1 }),
});
const panel = mountGluonDevtools(bridge);

panel.unmount();
unregister();
bridge.dispose();
app.unmount();
```

Render records include scheduling causes, reactive dependency counts, timing,
failure, and error data from the public Core debug hook. Router after-hooks and
Store subscriptions feed one ordered protocol timeline. Host integrations can
record scheduler, emitted-event, and error facts explicitly.

The package includes `browser-inspector.manifest.json` in its published files and
exports the matching `createDevtoolsArtifactContract()` result from the supported
package root. The manifest describes the ESM
inspector export, protocol version, serve-only runtime, callback-only redacted
source navigation, empty permission list, and disabled remote inspection. The
release gate validates the manifest against both the built declarations and the
actual `npm pack --dry-run` file list.

`bridge.handshake()` exposes the versioned `@gluonjs/devtools-api` capability
contract to external panels. Consumers can negotiate this before reading
`bridge.snapshot()` or subscribing to the timeline.

`gluonDevtoolsPlugin()` exposes `virtual:gluon-devtools`: its bridge is enabled
and globally discoverable only for Vite `serve`; production `build` emits a
disabled bridge. The browser inspector lists registered applications, shows the
selected application snapshot and filtered timeline in a Shadow DOM panel with
a constructable stylesheet, and surfaces safe source labels only when a
component or timeline record honestly carries one.

## License

MIT License, Copyright © 2026 Marc Malerei.
