<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/devtools-api.png" alt="@gluonjs/devtools-api — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

# @gluonjs/devtools-api

Environment-neutral protocol version 1 for independent Gluon Devtools clients.
`DevtoolsProtocol` owns application selection and one globally ordered timeline
of application, component, render, Router, Store, scheduler, event, and error
records. Snapshots are JSON-safe, preserve independent application IDs, and can
carry redacted source-location metadata for supported navigation targets.

External clients begin with `protocol.handshake()`. It returns the protocol
version and immutable capability names, so a browser inspector, Vite overlay,
or editor integration can refuse an incompatible bridge before subscribing to
records. The current capabilities are application selection, component
snapshots, source locations, the ordered timeline, and application/render/
Router/Store/scheduler/event/error records.

The package has no browser or framework dependency.

<!-- gluon-package-overview:start -->
## @gluonjs/devtools-api at a glance

**Runtime:** universal · **Release:** 1.12.1

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/devtools-api/) · [npm](https://www.npmjs.com/package/@gluonjs/devtools-api) · [Source](https://github.com/marcmalerei/gluon/blob/main/packages/devtools-api/README.md)

**Public API:** [`@gluonjs/devtools-api`](https://marcmalerei.github.io/gluon/1.12.1/api/generated/packages/devtools-api/src/)

### Install

```sh
npm install @gluonjs/devtools-api
```

### Quick start

```ts
import { DevtoolsProtocol } from '@gluonjs/devtools-api';

const protocol = new DevtoolsProtocol();
protocol.handshake();
```

### Choose this package when

- Inspector, overlay, and editor integrations that exchange structured records.
- Protocol handshakes and capability gating across environments.
- Independent application timelines and snapshots.

**Choose another boundary when:**

- Does not render UI or own a browser bridge by itself.
- Protocol consumers must validate capability compatibility.

### Related documentation

- [Devtools](https://marcmalerei.github.io/gluon/latest/guides/tooling/)
- [Diagnostics](https://marcmalerei.github.io/gluon/latest/reference/diagnostics/)

<!-- gluon-package-overview:end -->

## Record an application timeline

Create one protocol per Devtools client, register each application with a
snapshot provider, and retain every returned cleanup function:

```ts
import {
  DevtoolsProtocol,
  type ApplicationInspector,
} from '@gluonjs/devtools-api';

const inspector: ApplicationInspector = {
  id: 'shop',
  name: 'GLUON GOODS',
  snapshot: (selected) => ({
    id: 'shop',
    name: 'GLUON GOODS',
    selected,
    mounted: true,
    route: '/products/orbit-lamp',
    state: { bagCount: 1 },
    context: {},
    components: [],
    stylesheets: 3,
  }),
};

const protocol = new DevtoolsProtocol();
const unregister = protocol.registerApplication(inspector);
const unsubscribe = protocol.subscribe((snapshot, event) => {
  console.log(snapshot.selectedApplicationId, event?.sequence);
});

protocol.record('shop', 'store', { action: 'add', product: 'orbit-lamp' });
console.log(protocol.snapshot().timeline);

unsubscribe();
unregister();
```

`record()` accepts unknown payloads and converts them to the JSON-safe
`DevtoolsValue` contract. It rejects non-application events for unknown
application IDs. `snapshot()` returns immutable application and timeline
arrays; `clearTimeline()` removes recorded events without unregistering
applications.

`toDevtoolsSourceLocation()` converts caller-owned source references into a
bounded protocol record. It keeps only a basename-like file label, positive
line and column numbers, and a `redacted` flag so clients can navigate without
receiving production paths or excerpts. Runtime input is untrusted: kinds,
bounds, separators, URL suffixes, control characters, and even an existing
`redacted` marker are validated again.

## License

MIT License, Copyright © 2026 Marc Malerei.
