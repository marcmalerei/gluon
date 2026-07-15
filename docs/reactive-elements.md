# Reactive Custom Element contract

`GluonElement` integrates `@gluonjs/core` rendering with the shared
`@gluonjs/reactivity` dependency graph, scheduler, and effect scopes. The Core
package declares Reactivity as a runtime dependency and leaves that import
external in its production ESM build so an application uses one reactivity
identity.

## Render dependencies and scheduling

Each connected element owns one lazy render effect in a detached effect scope.
The first connection queues that runner in the scheduler's `update` phase.
Declared property writes, explicit `requestUpdate()` calls, and reactive
invalidations all queue the same runner identity with the element's stable
numeric update ID. Multiple synchronous writes are therefore deduplicated into
one render.

```ts
import { GluonElement, defineElement, html } from '@gluonjs/core';
import { reactive } from '@gluonjs/reactivity';

class CounterElement extends GluonElement {
  readonly state = reactive({ count: 0, ignored: false });

  protected override render() {
    return html`<output>${this.state.count}</output>`;
  }
}

defineElement('gluon-counter', CounterElement);
```

`defineGluonElement()` lowers concise setup-based authoring to the same class,
ShadowRoot, scheduler, lifecycle, event, form, SSR, hydration, HMR, Devtools,
and test-utility contract:

```ts
import { defineGluonElement, elementEvent, elementProperty, html } from '@gluonjs/core';

defineGluonElement({
  tagName: 'shop-quantity',
  formAssociated: true,
  properties: {
    product: elementProperty<{ id: string; price: number }>({ type: Object, required: true }),
    value: { type: Number, reflect: true, default: 1 },
  },
  events: { change: elementEvent<{ value: number }>({ cancelable: true }) },
  slots: { default: { required: true }, help: { fallback: true } },
  setup(context) {
    const value = context.state('value', context.props.value);
    const total = context.computed(() => value.value * context.props.product.price);
    context.onUpdated(() => context.form.setValue(String(value.value)));
    context.onCleanup(() => releaseListener());
    return {
      expose: { focus: () => context.host.shadowRoot?.querySelector('button')?.focus() },
      render: () => html`<slot></slot><button>${value.value}</button><output>${total.value}</output><slot name="help"></slot>`,
    };
  },
});
```

Primitive declarations infer from constructors/defaults.
`elementProperty<Value>()` carries a structured input type and
`elementEvent<Detail>()` carries native event detail; no duplicate element
interface or instance `declare` fields are needed. Setup runs synchronously once
per connected lifetime in a child effect scope. Explicitly keyed `state()` and
`reactiveState()` values survive reconnects; derived effects, watchers,
callbacks, and `onCleanup()` work are connection-owned. Lifecycle or form
registration after setup throws. The compiler reports detectable deferred
registration and listener/interval creation with no cleanup owner.
`context.props` is a readonly reactive view of the element's native declared
properties: every accepted property or reflected-attribute change invalidates
that view, so `watch(() => context.props.value, ...)` observes the same writes
that schedule the host render.

The complete timing, stop order, error, context, form, universal-rendering,
HMR, and standalone behavior is specified by
[RFC 0005](rfcs/0005-functional-custom-element-authoring.md).

Only reactive properties and collection operations read during the current
`update()`/`render()` execution become dependencies. Dependencies are rebuilt
on every run, so a value that is no longer read after a conditional branch
changes no longer invalidates the element. `updateComplete` refers to the
pending scheduled update and resolves after that render has committed.

The scheduler drains `pre`, `update`, and `post` phases in order. Element IDs
preserve deterministic ordering within the update phase, while matching runner
identity deduplicates declared-property and reactive invalidations that happen
in the same synchronous turn.

## Connection ownership

Connection creates a new detached effect scope and queues the lazy render
effect. The scope is active while the element's update executes, so effects,
watchers, and `onScopeDispose()` callbacks created during that execution are
owned by the current connection. The element also captures its application and
ancestor error-boundary routing once for that connection, reuses it across
updates, and captures the new ancestry after a disconnect/reconnect move.
Resource creation must still be guarded so a component does not create a
duplicate watcher on every render.

Disconnection performs reversible cleanup:

1. mark the element disconnected and stop its scope;
2. invalidate queued render effects and owned watcher jobs;
3. run owned watcher and scope cleanup;
4. resolve a cancelled pending `updateComplete`;
5. suspend renderer directives, listeners, and refs while retaining matching
   Shadow DOM and element state.

Reactive or declared-property writes while disconnected update their source
state but perform no DOM work. If the element reconnects, Gluon creates a new
scope and render effect, reads the current state, and resumes the retained DOM
when its template still matches. If it never reconnects, no stopped render
effect, watcher, directive, listener, ref, or scheduler job can execute on its
behalf.

## Development render diagnostics

`setGluonRenderDebugHook()` installs the current development observer and
returns a function that restores the previous observer:

```ts
import { setGluonRenderDebugHook } from '@gluonjs/core';

const restore = setGluonRenderDebugHook((event) => {
  console.log(event.element, event.causes, event.dependencies, event.duration);
});
```

One diagnostic is emitted after each completed or failed render. It contains:

- the `GluonElement` instance;
- every batched connection, explicit request, declared-property, and reactive
  cause recorded for that render;
- the reactive target, operation, and key for reactive causes;
- the dependencies tracked by the resulting render;
- `performance.now()` start/end timestamps and duration;
- a failure flag and the thrown value when rendering failed.

Reactive `onTrack`/`onTrigger` collection and the Gluon observer are disabled
when `globalThis.process?.env?.NODE_ENV` is `"production"`. Observer failures
are reported through `reportError` when available, otherwise `console.error`,
and do not change the render result. Application-specific error ownership is
part of issue #23 rather than this low-level diagnostic contract.
