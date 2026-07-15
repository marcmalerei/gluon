# Signals interoperability

Gluon consumes external signal graphs through optional Reactivity subpaths. The
stable `@gluonjs/reactivity` entry does not import either implementation.

## Standard Signals

Install `signal-polyfill@0.2.2`, then bridge a state or computed signal:

```ts
import { effect } from '@gluonjs/reactivity';
import { Signal, fromStandardSignal } from '@gluonjs/reactivity/signals';

const quantity = new Signal.State(1);
const total = new Signal.Computed(() => quantity.get() * 48);
const bridge = fromStandardSignal(total, { connect: true });

effect(() => console.log(bridge.value));
quantity.set(2);
```

The bridge reads the external graph directly and keeps only a Gluon revision
counter. Notifications are scheduled and coalesced; there is no polling and no
second computed graph. State bridges are writable. Computed read errors remain
the source implementation's errors.

Creation is disconnected by default. Server rendering can read `value` without
retaining a watcher. Call `connect()` during client ownership and `disconnect()`
or `bridge[Symbol.dispose]()` during teardown. Repeated lifecycle calls are
idempotent.

The default implementation accepts only objects branded by the bundled
`signal-polyfill` namespace. Signals from another realm or implementation are
rejected rather than combined with an incompatible Watcher. Pass that realm's
`implementation` namespace explicitly when its `State`, `Computed`, and
`subtle.Watcher` follow the proposal contract.

## Preact Signals

Install `@preact/signals-core` in the supported range `>=1.14.4 <2` and import
the separate adapter:

```ts
import { computed, signal } from '@preact/signals-core';
import { fromPreactSignal } from '@gluonjs/reactivity/preact-signals';

const quantity = signal(1);
const total = computed(() => quantity.value * 48);
const bridge = fromPreactSignal(total, { connect: true });
```

The adapter uses Preact's public `peek()` and `subscribe()` APIs. Writable
signals write through; computed signals remain readonly. The runnable
`examples/signals` application exercises both adapters in the same cart-shaped
flow, while GLUON GOODS uses the standard adapter for workshop availability.
