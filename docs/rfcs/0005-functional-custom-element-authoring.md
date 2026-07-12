# RFC 0005: Functional authoring for stateful Custom Elements

- Status: Accepted
- Date: 2026-07-12
- Owners: Core, Reactivity, Compiler, Vite, language tooling, SSR, Devtools,
  test utilities, `create-gluon`, Playground, and GLUON GOODS
- Parent: [issue #112](https://github.com/marcmalerei/gluon/issues/112)

## Decision

Gluon provides `defineGluonElement()` as a concise authoring path for a
stateful public boundary. It produces and registers an autonomous Custom Element
whose superclass is the existing `GluonElement`. It does not introduce a second
component instance, renderer, lifecycle, event system, context graph, scheduler,
or server implementation.

The existing class API remains public and behaviorally authoritative. The
functional API lowers to static property, event, slot, stylesheet, and form-
association metadata plus the protected `GluonElement` connection/render hooks.

## Definition and inference

A definition contains one literal custom-element tag, optional property/event/
slot/style/form metadata, and one `setup` function:

```ts
const QuantityControl = defineGluonElement({
  tagName: 'shop-quantity',
  formAssociated: true,
  properties: {
    product: elementProperty<Product>({ type: Object, required: true }),
    value: { type: Number, reflect: true, default: 1 },
  },
  events: {
    change: elementEvent<{ value: number }>({ cancelable: true }),
  },
  slots: {
    default: { required: true },
    help: { fallback: true },
  },
  styles: quantityStyles,
  setup(context) {
    const value = context.state('value', context.props.value)
    const doubled = context.computed(() => value.value * 2)
    context.onUpdated(() => context.form.setValue(String(value.value)))
    context.onCleanup(() => releaseOwnedResource())

    return {
      expose: {
        focus: () => context.host.shadowRoot?.querySelector('button')?.focus(),
      },
      render: () => html`<button>${doubled.value}</button><slot></slot>`,
    }
  },
})
```

Primitive property types are inferred from their constructor and default.
`elementProperty<Value>()` carries the type of a structured property without a
duplicate element interface or instance `declare` field. `elementEvent<Detail>()`
does the same for native `CustomEvent.detail`. Literal metadata keys infer slot
and event names. The object returned as `expose` infers callable host/public-ref
methods and getters.

## Setup timing and connection ownership

`setup` runs synchronously once for each connected lifetime, before that
lifetime's first render. It runs inside a child of the same detached connection
effect scope that owns `GluonElement` rendering. The active application and
element frame is installed before setup, so `context.inject()` and error routing
use the same owner as class rendering.

The setup function must synchronously return a render function. It may register
asynchronous work, but setup itself is not async. Asynchronous UI belongs in the
existing async-component and Suspense contracts.

Disconnect stops the connection scope. Reconnection runs setup again and creates
new computed values, watchers, watch-effect bodies, listeners, timers, abort
controllers, and lifecycle registrations. No connection-local effect remains
active while the element is disconnected.

## Reactive state and deterministic cleanup

`context.state(key, initializer)` retains one `Ref` for that element instance.
`context.reactiveState(key, initializer)` retains one reactive object. Keys are
explicit and stable; correctness never depends on call order. Their initializers
run only on first use for the instance, so state survives ordinary disconnect/
reconnect and compatible HMR.

`context.computed`, `context.watch`, and `context.watchEffect` execute in the
active setup scope and are recreated on reconnection. Direct calls to the same
public Reactivity functions during setup receive the same current scope.
`context.props` is a readonly reactive proxy over the host's declared native
properties. A successful native property or reflected-attribute change advances
an internal connection-local revision, allowing property-source watchers to
observe the write without replacing the host property/attribute contract.

Cleanup order is the existing `EffectScope.stop()` order:

1. reactive effects and watchers stop in reverse registration order;
2. child scopes stop in reverse registration order;
3. `context.onCleanup()` and `onScopeDispose()` callbacks run in reverse
   registration order;
4. registered `onDisconnected` callbacks run in registration order;
5. connection-local render and callback references are released.

Retained refs and reactive objects contain state only. They own no live watcher,
listener, timer, request, DOM ref, application context, or render closure.

## Render and lifecycle ownership

The returned render function is invoked by the existing `GluonElement` reactive
render effect. It commits through the existing renderer into the element's open
ShadowRoot and uses the existing before-update, updated, debug, error, and
`updateComplete` behavior.

`context.onConnected`, `onBeforeUpdate`, `onUpdated`, `onDisconnected`, and
`onErrorCaptured` register callbacks for the current connected lifetime. They
delegate to the class lifecycle pipeline; callback errors use the existing
application/ancestor boundary routing. Calling a context registration method
outside active setup is invalid.

## Context, errors, and public exposure

`context.inject()` reads the active application's typed provider graph. A
standalone element receives the same missing-provider behavior as a class
element outside an application.

Setup, render, watcher, cleanup, lifecycle, event, and public-method failures use
the existing `GluonElement`/Reactivity application error path. Ancestor element
error boundaries and the application handler remain the only error owners.

The returned `expose` object is frozen through the existing public-instance
contract. Its methods and getters are also installed on the autonomous element,
so plain HTML and third-party hosts use native element methods without a Gluon
wrapper. Compatible setup refresh replaces those method implementations on the
same host.

## Native properties, attributes, events, and content

The generated constructor publishes the literal property, event, slot, and
stylesheet metadata through the same static fields as a hand-written subclass.
`GluonElement` therefore owns defaults, pre-upgrade properties, conversion,
attribute reflection, validation, required-property warnings, native
`CustomEvent` dispatch, required-slot warnings, constructable stylesheet
adoption, and public refs without a functional-only branch.

The boundary remains an autonomous, registered Custom Element. Default and
named content remain native light-DOM children distributed through native
`slot` elements. There is no framework-private content transport.

## Form association

`formAssociated: true` emits the same static platform declaration as the class
API and acquires one `ElementInternals` instance in a browser. The typed
`context.form` owner exposes form/labels, value/state transport, validity, and
registration for disabled, reset, and state-restore callbacks. The host exposes
the native `form`, `labels`, validity, validation-message, `checkValidity`,
`reportValidity`, and `setCustomValidity` surface.

The setup result normally calls `context.form.setValue()` and `setValidity()`
from `onUpdated`, after the committed control state is known. Form state lives in
the same `ElementInternals` instance across compatible HMR and reconnects.

In DOM-independent server rendering, form operations are inert transport
operations because `ElementInternals` does not exist. The same public definition
still renders; browser upgrade supplies the live platform owner.

## Universal rendering

Server rendering instantiates the same registered generated constructor. It
runs setup in an isolated request-owned effect scope, calls the returned render
function, and stops that scope immediately after the template is derived.
Connection lifecycle does not run on the server.

Streaming and SSG consume that same server template through the existing SSR
value contract. Hydration upgrades the same autonomous element, binds its
existing declarative ShadowRoot, runs normal connection-owned setup, and passes
the resulting template to the existing element hydration path. No duplicated
server component or hydration adapter is permitted.

## HMR

The compiler recognizes imported `defineGluonElement` calls and routes them
through the official Vite element bridge. Development evaluation creates an
unregistered next constructor; the bridge retains the registered constructor
and patches compatible prototype/static behavior.

On a compatible edit, the existing host schedules a render, stops its old setup
child scope, reruns the patched setup inside the active render owner, and retains
explicit state cells, `ElementInternals` form state, ShadowRoot, render-managed
DOM where the template identity is compatible, and stylesheet identity. Public
methods receive the patched implementation.

Tag, superclass, form-association, property/attribute, event, slot, or stylesheet-
count schema changes cross the reload boundary. Setup/render/callback logic and
stylesheet text are compatible changes.

## Tooling and diagnostics

Compiler and language tooling derive the tag and public metadata directly from
the literal definition. They must report source-located errors for invalid tag,
properties, events, slots, lifecycle registration, and resource creation that
escapes the declared cleanup owner. The Custom Elements Manifest and Devtools
tree describe the same autonomous host and inferred contract; they do not expose
a nested functional instance.

For literal definitions, an unknown literal named light-DOM assignment is
reported as `GLUON_TEMPLATE_SLOT_UNKNOWN` at the `slot` value by the shared
editor and `gluon-template-check` analyzer.

## Standalone and interoperability behavior

Importing or creating a definition performs no document mutation until
`defineGluonElement()` explicitly registers the tag. Importing helper functions
does not register a tag. In production, a conflicting tag definition fails
through `defineElement()` exactly as the class API does.

After registration, plain HTML, Gluon, Vue, React, and other DOM hosts interact
through properties, reflected attributes, native events, slots, element methods,
focus, and form participation. A framework wrapper is not part of the contract.

## Rejected alternatives

- A function component with hidden state was rejected because it would create a
  second state/lifecycle owner and no autonomous public boundary.
- call-order-dependent hooks were rejected; retained local state uses explicit
  keys and lifecycle registration is valid only inside one setup owner.
- one process-global setup registry was rejected because it would cross
  applications, documents, requests, and tests.
- retaining live setup effects while disconnected was rejected because it would
  violate the existing resource-release contract.
- a proprietary component file format was rejected; the API is ordinary typed
  TypeScript using the existing HTML template direction.
