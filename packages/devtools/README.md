# `@gluonjs/devtools`

Gluon Devtools is explicitly opt-in. `createDevtoolsBridge()` defaults to
`enabled: false`, installs no render hook, and exposes no global. Development
entry points enable it deliberately and register each application root with an
independent ID plus optional Router, Store, state, and context inspectors.

```ts
const bridge = createDevtoolsBridge({ enabled: true, exposeGlobal: true });
bridge.registerApplication({ id: 'shop', app, root, router, store });
mountGluonDevtools(bridge);
```

Render records include scheduling causes, reactive dependency counts, timing,
failure, and error data from the public Core debug hook. Router after-hooks and
Store subscriptions feed one ordered protocol timeline. Host integrations can
record scheduler, emitted-event, and error facts explicitly.

`gluonDevtoolsPlugin()` exposes `virtual:gluon-devtools`: its bridge is enabled
and globally discoverable only for Vite `serve`; production `build` emits a
disabled bridge. The browser inspector lists registered applications and shows
the selected application snapshot and filtered timeline in a Shadow DOM panel
with a constructable stylesheet.

## License

MIT License, Copyright © 2026 Marc Malerei.
