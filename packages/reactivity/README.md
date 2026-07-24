<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/reactivity.png" alt="@gluonjs/reactivity — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

DOM-free reactive state primitives for Gluon. The package is part of the
lockstep Gluon `1.4.0` release line.

```ts
import { computed, effect, nextTick, reactive, ref } from '@gluonjs/reactivity';

const count = ref(1);
const state = reactive({ multiplier: 2 });
const total = computed(() => count.value * state.multiplier);

effect(() => {
  console.log(total.value);
}, { flush: 'pre' });

count.value = 2;
await nextTick();
```

## API

- `ref`, `shallowRef`, `isRef`, and `unref`
- `reactive`, `shallowReactive`, `readonly`, and `shallowReadonly`
- `isReactive`, `isReadonly`, `isProxy`, and `toRaw`
- `effect`, `stop`, lazy activation, scheduling hooks, and development-only
  `onTrack`/`onTrigger` callbacks
- lazy, cached readonly and writable `computed` values
- `batch`, `untracked`, phased queue helpers, and `nextTick`
- attached or detached `effectScope` ownership and `onScopeDispose`
- scheduled `watch` and `watchEffect` with deterministic cleanup
- global, scope-local, job-local, and effect-local error handlers

## Optional external Signals

The `@gluonjs/reactivity/signals` subpath bridges TC39 proposal Signals from
`signal-polyfill@0.2.2`. The independent
`@gluonjs/reactivity/preact-signals` subpath supports
`@preact/signals-core >=1.14.4 <2`. Neither optional peer is imported by the
stable Reactivity entry.

Both adapters read the external graph directly, coalesce scheduled
notifications, expose explicit `connect()`/`disconnect()` ownership, and remain
disconnected for SSR unless the application opts in. See the
[interoperability contract](../../docs/signals-interop.md) and the runnable
[`examples/signals`](../../examples/signals) application.

Deep reactive proxies support plain objects, arrays, `Map`, and `Set`. The
package source compiles with the ES2022 library and no DOM or Node ambient
types.

## Scheduler contract

Queued work is deduplicated by function within its phase. A flush runs `pre`,
`update`, and `post` phases in that order. Within a phase, smaller numeric IDs
run before larger IDs so parent owners can precede children; equal or omitted
IDs retain insertion order. Work queued for a phase that already completed runs
in the next cycle of the same flush. `nextTick()` resolves only after every
cycle, including post-flush work, is complete. A queued job may return a promise;
the current phase waits for it and routes rejection through the same error
channel. Synchronous jobs in one phase run back-to-back without an inserted
microtask; an actual promise pauses later jobs until it settles.

Effects are synchronous by default. `flush: 'pre'`, `flush: 'update'`, and
`flush: 'post'` opt into the matching shared microtask phase. `lazy: true`
returns a runner without executing it; `onSchedule` runs synchronously before
an invalidated effect enters its selected phase. `batch()` deduplicates
synchronous invalidations until the outermost synchronous batch returns; it
does not extend across an `await` boundary.

An attached scope stops its owned effects in reverse creation order, then child
scopes in reverse creation order, then cleanup callbacks in reverse registration
order. A detached scope has independent ownership. Stopping a scope cancels its
queued effects and watchers and prevents their runners from executing again.
If an effect stop hook throws, the scope reports a cleanup error and continues
stopping the remaining effects and resources.

Errors are delivered to the closest explicit effect, watcher, job, or scope
handler. When no local handler exists, the handler installed by
`setReactivityErrorHandler` receives them. The default channel uses platform
`reportError` when present and otherwise `console.error`. Handler failures are
contained by the default channel so scheduler flushes and `nextTick` do not
become unhandled promise rejections.

## License

[MIT](LICENSE) — Copyright © 2026 Marc Malerei.
