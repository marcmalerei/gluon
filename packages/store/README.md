<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/store.png" alt="@gluonjs/store — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

The official Gluon store provides typed, application-scoped state without a
DOM dependency. Store definitions infer state, computed getter values, action
arguments, and action results from one definition.

The package ships as part of the current `1.9.0` release line.

## Stability notes

The store surface is stable in the current release line. Application-scoped
managers, snapshots, persistence plugins, and hydration remain supported; a
process-wide singleton manager is still unsupported.

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
are written after recorded transactions as a versioned persisted-state envelope
that is independent from `StoreSnapshot`, devtools, or HMR versions. Definitions
may opt into explicit contiguous `from -> to` migrations and, when needed, an
explicit legacy decoder for older unversioned payloads. The decoder's `to`
value names the version of the state it returns; later declared steps then run
in order up to the store's current persistence version.
Migration callbacks accept ordinary typed object records; application DTOs do
not need a string index signature. Gluon normalizes and validates every result
as JSON-safe state before applying or storing it.

```ts
const profile = defineStore({
  id: 'profile',
  state: () => ({ count: 0, label: 'new' }),
  persist: {
    version: 2,
    legacy: {
      to: 0,
      migrate: (state) => ({ count: Number(state.count ?? 0) }),
    },
    migrations: [
      { from: 0, to: 1, migrate: (state) => ({ ...state, label: 'legacy' }) },
      { from: 1, to: 2, migrate: (state) => ({ ...state, label: String(state.label) }) },
    ],
  },
});
```

Storage access, parse, future-version, corrupt-envelope, and migration errors
are reported through `onError` when supplied together with a recovery context.
The context exposes caller-owned `reset()`, `remove()`, and `quarantine()`
operations. The plugin never silently overwrites a bad payload; the caller must
choose the recovery action. `remove()` and `quarantine()` require the supplied
`StorageLike` adapter to implement `removeItem()`; otherwise they throw and the
store remains blocked from persistence writes.

A missing key leaves the definition's initial state unchanged. A valid older
envelope is migrated in memory and is written with the current version after
the next store transaction. Future, corrupt, missing-step, thrown-migration,
invalid-output, and storage failures block later persistence writes until one
of the explicit recovery operations succeeds.

### Async bootstrap

For adapters such as IndexedDB, use `createAsyncPersistencePlugin()` without
changing the synchronous `StorageLike` contract:

```ts
const persistence = createAsyncPersistencePlugin({ storage: asyncStorage });
const manager = createStoreManager({ plugins: [persistence] });
const appStore = cartDefinition.use(manager);

// Defaults are available synchronously; restored state is ready at this boundary.
await persistence.lifecycle.ready;
startRouterAndRendering(appStore);
```

The lifecycle is `idle`, `hydrating`, `ready`, or `failed`. The `ready` getter
returns the current hydration-cycle promise: it preserves same-turn bootstrap
when the first store is used and changes for a later store that starts a new
cycle. Actions and subscriptions can run during hydration; a generation check
prevents an older read from overwriting those mutations, and persistence writes
are strictly serialized in transaction order. Read/write failures set
`failed`, stop queued writes, and call `onError` once. A successful unchanged
restore is not redundantly written back. External abort or `lifecycle.dispose()` also set
`failed` with a DOM-free `Error` named `AbortError`, settle `ready` immediately,
and do not call `onError`; adapters that ignore cancellation therefore cannot
hold application bootstrap open forever. Each plugin instance is isolated to
one application lifecycle.

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
