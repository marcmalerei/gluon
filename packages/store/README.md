# `@gluonjs/store`

The official Gluon store provides typed, application-scoped state without a
DOM dependency. Store definitions infer state, computed getter values, action
arguments, and action results from one definition.

The package is part of the lockstep Gluon `1.0.3` release line.

## Define and use a store

```ts
import { createStoreManager, defineStore } from '@gluonjs/store';

const counterDefinition = defineStore('counter', () => ({ count: 0 }), {
  getters: (state) => ({
    doubled: state.count * 2,
  }),
  actions: (store) => ({
    increment(amount = 1) {
      store.count += amount;
      return store.count;
    },
  }),
});

const manager = createStoreManager();
const counter = counterDefinition.use(manager);
counter.increment(2);
console.log(counter.doubled); // 4
```

A manager owns one instance per definition id. Create one manager per browser
application, test, or server request; do not export a process-wide manager.
Call `manager.dispose()` with the owning application or request lifecycle.
Disposed stores reject actions, direct state writes, patches, resets, and new
subscription hooks so an external stale reference cannot reactivate a released
runtime.

## Transactions and plugins

Actions, `$patch()`, `$reset()`, hydration, and HMR publish ordered transaction
records with before/after snapshots, status, metadata, store id, and action
name. `$subscribe()` observes one store; `manager.subscribe()` observes all
stores in that manager. `$onAction()` provides completion and error hooks.

`manager.withMetadata(metadata, callback)` attaches request or interaction
metadata to transactions initiated by the callback. Store plugins run once per
created store and may return extension properties or a cleanup callback.
Direct state assignments remain reactive but do not create transaction records;
use actions or `$patch()` when a mutation must be inspectable.

## Persistence

Persistence is explicit and storage-agnostic:

```ts
const cartDefinition = defineStore('cart', () => ({
  items: [] as string[],
  drawerOpen: false,
}), {
  persist: { paths: ['items'] },
});

const manager = createStoreManager({
  plugins: [createPersistencePlugin({
    storage: localStorage,
    namespace: 'my-app',
  })],
});
```

The plugin reads only definitions that opt in through `persist`. Selected paths
are written after recorded transactions. Storage access failures are reported
through `onError` when supplied.

## SSR, hydration, and HMR

`dehydrate()` returns the versioned DOM-free snapshot contract. `serialize()`
also escapes `<`, `>`, `&`, U+2028, and U+2029 for safe embedding in HTML.
State accepts finite JSON values made from plain objects and arrays; circular
references, unsafe property keys, class instances, functions, symbols, bigint,
and non-finite numbers are rejected.

`hydrate()` can run before or after definitions are used. Unknown top-level
state keys are ignored, so snapshots cannot expand a store's declared schema.
`hotUpdate()` replaces getters and actions in place. Existing values survive
only when their top-level kinds remain compatible: arrays with arrays, plain
objects with plain objects, null with null, and primitives of the same type.
Removed keys are deleted and new or incompatible keys use the new defaults.

`createTestingStoreManager()` creates an isolated manager and can receive a
snapshot or per-store initial state. The declaration contract tests and Node
contract suite cover inference, request isolation, hydration, HMR, plugins,
persistence, and transaction behavior.

See the repository [store contract](../../docs/store.md) for the complete
runtime and security rules.

## License

MIT License, Copyright © 2026 Marc Malerei.
