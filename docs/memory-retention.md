# Memory and retention evidence

Gluon makes deterministic resource-retention claims, not a universal heap-size
claim. `tests/memory-retention.spec.ts` repeats the complete product-detail to
bag flow 30 times and verifies that application unmount releases owned DOM,
Teleport/dialog nodes, event listeners, Router subscriptions, Store runtimes,
reactive scopes, and KeepAlive views. A detached button is clicked after
unmount to prove its listener no longer mutates the Store.

`@gluonjs/test-utils` tracks every active fixture and owned cleanup. The same
gate verifies that fixture cleanup disconnects listeners and leaves no active
fixture names. Existing component, built-in, Router, Store, Suspense, hydration,
and application-runtime suites cover their narrower cancellation and cleanup
contracts.

These checks are repeatable retention evidence because they assert observable
ownership after teardown in Chromium, Firefox, and WebKit. They do not claim a
fixed process heap, absence of browser-internal caches, or deterministic garbage
collection. Heap-growth claims require a separate browser/version-specific
profile with raw samples and an explicit collection protocol.

The production [`runtime scorecard`](performance.md#expanded-runtime-scorecard)
adds a timed retention lane. Every sample mounts, interacts with, unmounts, and
probes 30 application roots. Acceptance requires zero retained root DOM nodes
and zero mutations from detached button listeners in Chromium, Firefox, and
WebKit. It reports teardown latency independently per engine. This remains
deterministic ownership evidence; it does not convert the gate into a browser
heap-size or garbage-collection claim.
