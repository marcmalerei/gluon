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
opt in with `persist: true` or selected state paths. The plugin hydrates at
store creation and writes after transactions.

Persisted records use a versioned envelope that is separate from
`StoreSnapshot`. Definitions may declare a current persisted `version`, explicit
contiguous `migrations` with `from`/`to` steps, and an explicit `legacy`
decoder for older unversioned payloads. The plugin validates the envelope
before patching state, classifies future/corrupt/migration failures, and
exposes caller-controlled `reset()`, `remove()`, and `quarantine()` recovery
hooks through `onError`. It never silently overwrites a bad payload.
The legacy decoder's `to` field is the version of its returned state; any
remaining contiguous migration steps run afterward. Removal and quarantine
require an adapter with `removeItem()` and fail without unblocking writes when
that capability is absent.
Migration callbacks may return ordinary typed DTO records without adding a
string index signature. Every result is still normalized and validated as
JSON-safe state before it can be applied or persisted.

Missing storage leaves the store defaults intact. Successful older state is
migrated in memory and receives the current envelope on the next transaction;
future, corrupt, missing-step, thrown-migration, invalid-output, and storage
failures block persistence writes until explicit recovery succeeds.

### Async persistence lifecycle

`createAsyncPersistencePlugin()` adds promise-based persistence without changing
`StorageLike` or the synchronous plugin. It is request-free and application-local:

```ts
const persistence = createAsyncPersistencePlugin({ storage: indexedDbAdapter });
const manager = createStoreManager({ plugins: [persistence] });
const store = definition.use(manager); // defaults are available immediately
await persistence.lifecycle.ready;       // restored state is now safe to observe
```

The lifecycle is `idle` before a persistent store is used, `hydrating` while
reads are pending, `ready` after all reads finish, and `failed` after a read or
write error. `ready` always settles, including failure, so bootstrap code can
inspect `lifecycle.status` and `lifecycle.error`. Restore runs before the
ready boundary; actions and subscriptions may run during hydration, but their
writes are queued until hydration completes. A mutation observed before a read
resolves wins: a generation check prevents the stale read from overwriting it.
Writes are serialized in subscription order. Pass an `AbortSignal` or call
`lifecycle.dispose()` to cancel pending work; each plugin instance has isolated
state and storage operations. The adapter should honor the supplied signal.

GLUON GOODS remains on synchronous storage because its current bag flow does
not benefit from an asynchronous customer-facing bootstrap boundary. This is
an honest gap record, not an async adapter implementation in the shop.

The application owns validation and suitability decisions. Persistence is not a
security boundary and is only as safe as the application data it stores; use it
for rollback-compatible app state, not for sensitive data unless the caller has
audited the full storage lifecycle.

`createTestingStoreManager()` returns an ordinary isolated manager with optional
initial state. Tests therefore exercise the same actions, getters, plugins,
transactions, serialization, and disposal behavior as production code.

## Verification

- `npm run test:store:coverage`
- `npm run typecheck:store-api`
- `npm run build:store`
- `tests/shop-example.spec.ts` for application isolation and bag persistence
