# Reactive platform observers

Core exposes callback-ref-owned wrappers for the browser's intersection, resize,
and mutation observers. Each handle publishes its latest callback batch through
Gluon Reactivity and disconnects when its callback ref is cleared, retargeted, or
stopped.

```ts
import { createIntersectionObserver, html } from '@gluonjs/core';

const visibility = createIntersectionObserver<HTMLImageElement>(
  { rootMargin: '200px' },
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) visibility.stop();
  },
);

const view = html`<img ...=${{ ref: visibility.ref }} src="product.webp" alt="Black desk lamp">`;
```

`entries` and `supported` are readonly refs. Assigning a new element to `ref`
disconnects the previous observer and clears stale entries. Callbacks from an
old observer generation are ignored. `stop()` is idempotent, clears published
state, disconnects the active observer, and makes the handle permanently inert.

`createResizeObserver()` passes its options to `observe()`, as required by the
platform API. `createMutationObserver()` requires a `MutationObserverInit` and
also passes it to `observe()`. Intersection options are constructor options.

The constructor is resolved from the target element's `ownerDocument` realm.
This keeps iframe and multi-document targets correct. When that realm does not
provide the requested observer, `supported.value` remains `false`, no observer
is created, and content continues without enhancement. Server rendering omits
the callback ref like every event/ref binding and does not create or retain an
observer.

The handle owns one target. Clear the callback ref on teardown or call `stop()`
for early completion. The renderer clears callback refs whenever their element
or owning template is removed, so ordinary Gluon rendering provides automatic
observer cleanup.
