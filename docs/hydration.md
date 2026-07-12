# Hydration and progressive streaming

`@gluonjs/ssr` emits deterministic paired comment markers for child and list
bindings and temporary `data-gluon-h-*` markers for attribute, event, property,
spread, and ref bindings. Marker numbers follow template evaluation order and
are request-local. They contain no application state.

## Browser handoff

Use the public browser entry point after restoring request snapshots:

```ts
import {
  hydrateApplication,
  hydrateRequestState,
  readHydrationState,
} from '@gluonjs/ssr/hydration';

const state = readHydrationState();
await hydrateRequestState(state, router, store);
const { mount, hydration } = await hydrateApplication(app, container);
```

For the optional UI packages, create the server style input and browser owner
from the same public theme value:

```ts
// server
import { createUiStyleSelection } from '@gluonjs/atoms';
const response = await renderRequest({
  url,
  createApp,
  styles: createUiStyleSelection('dark'),
});

// browser, before application hydration
import { installUi } from '@gluonjs/atoms';
const ui = installUi(document, { theme: 'dark', hydrate: true });
```

No separate UI manifest is maintained. `installUi()` validates the four named
`gluon-ui` carriers and removes only those carriers after it has adopted its
target-local sheets. The returned owner must live as long as the application
and be disposed with it.

The handoff validates the parsed DOM before mutation. A matching root is adopted
as renderer state, event listeners and refs are installed, and the first
application render records reactive dependencies without reapplying the DOM.
Open declarative shadow roots use `hydrateElement()`; element connection render
is deferred until the matching shadow tree has been adopted.

The successful result has `retained: true`. Temporary attribute and end markers
are removed; child anchors remain as renderer ownership boundaries.

## Diagnostics and recovery

Diagnostics use stable categories and codes:

| Category | Code | Compared surface |
| --- | --- | --- |
| text | `GLUON_HYDRATION_TEXT_MISMATCH` | Text node content |
| attribute | `GLUON_HYDRATION_ATTRIBUTE_MISMATCH` | Non-style attributes and binding markers |
| structure | `GLUON_HYDRATION_STRUCTURE_MISMATCH` | Node count, type, element name, namespace, and marker ranges |
| state | `GLUON_HYDRATION_STATE_MISMATCH` | Caller-supplied server/client snapshots |
| style | `GLUON_HYDRATION_STYLE_MISMATCH` | Inline style attributes; SSR carrier failures use `GLUON_UNSUPPORTED_SSR_TRANSPORT` before DOM hydration |

UI selection carriers additionally use `GLUON_UI_HYDRATION_MISMATCH` with the
typed reason `missing`, `duplicate`, `reordered`, or `mismatched`.
Usage-derived component carriers use
`GLUON_COMPONENT_STYLE_HYDRATION_MISMATCH` with `missing`, `extra`,
`duplicate`, `reordered`, `mismatched`, or `wrong-target`. The browser derives
the expected component selection from the prepared value tree, adopts the exact
client sheet identities through renderer ownership, and removes carriers only
after successful binding. Renderer unmount then releases those sheets.

Each record includes the DOM/state path, expected and actual values, chosen
recovery, and suppression status. Default recovery replaces the complete root
once with a client render. `recovery: 'throw'` raises
`HydrationMismatchError` before DOM mutation. `suppress: true` or a category
list suppresses only the callback; the mismatch remains recorded and recovery
still runs.

## Progressive responses

`renderProgressively()` returns a structured async iterator. Its first record is
the shell with every pending `Suspense` fallback and the exact component styles
used by that shell. Later boundary records contain resolved HTML plus only newly
required component styles. A resolved boundary may add nested pending
boundaries. `renderProgressiveReadableStream()` writes each record's carriers
before its dependent shell or inert `template[data-gluon-async-patch]`.

Pass the HTTP response or request `AbortSignal` through `signal`. Cancellation
rejects the iterator with the abort reason and aborts pending Gluon async source
controllers. Consumers decide how inert patch templates are applied before
hydration; Gluon does not inject executable inline scripts.

## Verification

- `tests/hydration.spec.ts` proves root, child, ref, event, context, reactive,
  Router, Store, shop-flow, mismatch, recovery, and declarative-shadow identity.
- `tests-node/ssr.spec.ts` proves marker serialization, nested progressive
  boundaries, request isolation, and aborted async work without browser globals.
