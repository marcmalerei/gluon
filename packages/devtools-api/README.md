<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/devtools-api.png" alt="@gluonjs/devtools-api — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

Environment-neutral protocol version 1 for independent Gluon Devtools clients.
`DevtoolsProtocol` owns application selection and one globally ordered timeline
of application, component, render, Router, Store, scheduler, event, and error
records. Snapshots are JSON-safe and preserve independent application IDs.

The package has no browser or framework dependency.

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

## License

MIT License, Copyright © 2026 Marc Malerei.
