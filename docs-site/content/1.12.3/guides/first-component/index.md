# Build one stateful component

This is the shortest path from HTML and TypeScript to a reusable Gluon
component. It uses one native Custom Element, one public property, local state,
one event, a stylesheet, a first-render action, update observation, and cleanup.
Read it before comparing every authoring model.

## The requirement

Build a quantity control that can be placed in plain HTML, increments from a
button or keyboard shortcut, announces its current value, and tells its parent
when the user applies the value.

The ownership is deliberately small:

| Concern | Owner |
| --- | --- |
| `label` | Parent input/property |
| `quantity` | Component-local reactive state |
| `change` | Native component output event |
| Button and output markup | Component render function |
| Keydown listener | Component connection |
| Listener cancellation | Component cleanup |

## The complete flow

<<< ../../../../examples/stateful-component.ts

The `setup()` function runs for the element's connected lifetime. `context.state`
creates a reactive value; reading it in `render()` makes the template update
when a button changes it. The parent receives a normal `CustomEvent`, not a
framework-specific callback.

The component is a real Custom Element: it has a host, a Shadow Root, native
connection boundaries, and a tag name. A parent can use it from HTML after its
module has been imported:

```html
<quantity-control label="Seats"></quantity-control>
<script type="module" src="./quantity-control.ts"></script>
```

## When each lifecycle hook is useful

| Moment | Use | Example in this component |
| --- | --- | --- |
| First successful render | `onConnected()` | Focus the now-existing button and attach connection-owned work. |
| Before a later render | `onBeforeUpdate()` | Prepare work from changed inputs before DOM commits. |
| After a render | `onUpdated()` | Measure or initialize a DOM-dependent library. |
| Disconnect | `onDisconnected()` | Stop an explicit connection activity. |
| Any owned release | `onCleanup()` | Abort listeners, subscriptions, timers, and requests. |

The sequence is: connect → first render → connected callback → updated
callback → later property/state update → before-update callback → render →
updated callback → disconnect → cleanup. Disconnecting does not destroy the
element object; reconnecting starts a new connection scope. Keyed state created
with `context.state()` survives that reconnect, while connection-owned listeners
must be registered again.

Do not add a lifecycle hook just to redraw after a reactive write. A state or
declared property read by `render()` already schedules the update. Use a hook
when the work talks to an imperative API, a subscription, or committed DOM.

## Troubleshoot from the symptom

| Symptom | Likely cause | First check | Fix |
| --- | --- | --- | --- |
| Input shows `[object Object]` | An object crossed the HTML attribute boundary | Check the binding syntax | Use `.product=${product}` property binding. |
| State changes but UI does not | State was copied outside the render dependency | Check that render reads `.value` | Read the reactive state in the template. |
| Listener fires after removal | Imperative listener was not connection-owned | Remove/reinsert the element and watch the count | Use `context.onCleanup()` or an abort signal. |
| DOM library sees no element | Initialization ran before the first render | Check whether the queried node exists | Initialize in `onConnected()` or `onUpdated()`. |
| Event crosses no host boundary | The event is not composed | Inspect the event declaration | Use the native composed/bubbling event contract required by the parent. |

For renderer diagnostics, use the [diagnostic reference](../../reference/diagnostics/)
and the [tooling guide](../tooling/). The [components guide](../components/)
then explains class-based APIs, properties, events, and advanced extension
points.
