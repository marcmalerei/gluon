# Devtools

Gluon Devtools separates the environment-neutral version 1 protocol from the
browser integration. `@gluonjs/devtools-api` owns JSON-safe snapshots,
application selection, subscriptions, and the ordered event timeline.
`@gluonjs/devtools` connects public Core render diagnostics plus Router and
Store subscriptions and provides a browser-hosted inspector.

## Development activation

The bridge is off by default:

```ts
const bridge = createDevtoolsBridge({ enabled: true, exposeGlobal: true });
const unregister = bridge.registerApplication({
  id: 'shop',
  name: 'GLUON GOODS',
  app,
  root,
  router,
  store: storeManager,
  context: () => ({ locale: 'en' }),
});
const inspector = mountGluonDevtools(bridge);
```

`gluonDevtoolsPlugin()` serves a `virtual:gluon-devtools` module. The module
creates an enabled, discoverable bridge only for Vite `serve`; Vite `build`
creates a disabled bridge. Merely importing `@gluonjs/devtools` does not define
elements, mutate the DOM, install hooks, or create globals.

## Snapshot contract

Each registered application retains its own root, mounted state, route, Store
snapshot or explicit state reader, context reader, Custom Element tree,
declared property values, attributes, and adopted stylesheet counts. Selection
changes only the `selected` application; it does not merge application state.

Timeline records have a monotonically increasing sequence and one of these
kinds: application, component, error, event, render, router, scheduler, or
store. Render payloads include the exact Core scheduling causes, reactive
dependency count, duration, failure, and normalized error. Router completion
or failure and complete Store transactions retain their original order.

Host integrations use `recordScheduler()`, `recordEvent()`, and
`recordError()` for facts not owned by the Core render hook. All unknown values
are converted to finite JSON-safe protocol values; circular references are
reported as `[Circular]`.
