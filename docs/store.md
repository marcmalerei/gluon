# Store contract

`@gluonjs/store` is Gluon's DOM-free, application-scoped state package. This
document defines the current public behavior delivered for roadmap issue #26.

## Ownership

- A `StoreManager` owns at most one live store for each definition id.
- Definitions contain factories, not live state, and may be reused across
  managers.
- Browser applications, server requests, and tests create separate managers.
- Disposing a store stops its computed getter scope, subscriptions, action
  hooks, and plugin cleanups. Disposing a manager disposes all stores.
- A disposed store or manager rejects later mutation or creation operations.

## Definition and inference

`defineStore(id, state, behavior)` infers the public store from three factories:

- `state()` returns a plain object and runs once for each manager instance.
- `getters(readonlyState)` returns a plain object of computed values. Each
  public getter is readonly and recomputes through Gluon Reactivity.
- `actions(store)` returns functions. Their arguments and return values remain
  part of the inferred public type.

State, getter, and action names must be unique. `__proto__`, `constructor`,
`prototype`, and `$`-prefixed state names are rejected.

## Mutation and inspection

Actions execute inside `batch()`. The following operations publish a completed
`StoreTransaction` in manager-local order:

| Operation | Transaction type |
| --- | --- |
| action | `action` |
| object patch | `patch-object` |
| function patch | `patch-function` |
| reset | `reset` |
| snapshot hydration | `hydrate` |
| definition replacement | `hmr` |

Records contain manager-local numeric id, store id, timestamp, optional action
name, status, metadata, and finite JSON before/after state. Rejected synchronous
and asynchronous actions publish `rejected` with the thrown value and then
rethrow it. Direct property assignment is reactive but intentionally produces
no transaction record.

Store subscriptions observe one store. Manager subscriptions and the
`onTransaction` option observe all stores. Action subscriptions register
`after` and `onError` callbacks before execution. Plugins run in registration
order and may contribute `$extensions` properties or cleanup functions.

## Snapshots and request isolation

Snapshots use `{ version: 1, stores }`. Hydration accepts an already-created
store or retains state until that definition is first used. Only declared
top-level state keys are applied. Every snapshot is copied before assignment,
so the caller's snapshot object is not installed as live state.

`serialize()` produces JSON with HTML-sensitive characters escaped. The state
format supports null, booleans, strings, finite numbers, arrays, and plain
objects. It rejects circular data, non-finite numbers, unsupported JavaScript
values, non-plain objects, and prototype-sensitive keys. These rules cover the
store state handoff; the server renderer and CSP transport remain owned by
issues #35–#37.

## HMR

`hotUpdate(definition)` preserves the existing store object. It stops the old
computed scope, reconciles state, and installs the new getters and actions.
Compatibility is determined at each top-level state key:

- array ↔ array is compatible;
- plain object ↔ plain object is compatible;
- null ↔ null is compatible;
- primitive values are compatible when `typeof` matches.

Compatible values survive. Removed keys are deleted. New and incompatible keys
receive the new state factory's defaults. A completed `hmr` transaction records
the resulting change.

## Persistence and testing

`createPersistencePlugin()` requires a `StorageLike` adapter. A definition must
opt in with `persist: true` or selected state paths. The plugin hydrates at store
creation and writes after transactions. It never accesses browser globals on
its own.

`createTestingStoreManager()` returns an ordinary isolated manager with optional
initial state. Tests therefore exercise the same actions, getters, plugins,
transactions, serialization, and disposal behavior as production code.

## Verification

- `npm run test:store:coverage`
- `npm run typecheck:store-api`
- `npm run build:store`
- `tests/shop-example.spec.ts` for application isolation and bag persistence
