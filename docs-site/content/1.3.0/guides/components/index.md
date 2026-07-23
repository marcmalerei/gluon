# Components: properties, events, and lifecycle

This guide starts with the component boundary instead of the TypeScript type
list. It explains what data crosses that boundary, who owns it, and which Gluon
API to use. All examples import public `1.3.0` package entry points and are
compiled by the documentation quality gate.

## The four terms to know

- A **property** is an input stored on the Custom Element instance. A property
  can hold any JavaScript value, including an object or array.
- An **attribute** is HTML text. A declaration can convert an attribute to a
  property and can optionally reflect a property back to the attribute.
- An **event** is native output from the component. Its application payload is
  in `CustomEvent.detail`.
- A **component class** is the Custom Element implementation. Its static fields
  describe the public contract; its instance owns rendering and lifecycle.

Props are inputs and events are outputs. Do not mutate an object owned by the
parent and call that an event. Emit the requested change and let the owner decide
whether to update the property.

## Choose an authoring model

| Need | Use | Why |
| --- | --- | --- |
| A stateful Custom Element with concise setup-owned state and cleanup | `defineGluonElement()` | It infers declared property and event types and creates the same native element contract without a handwritten subclass. |
| Inheritance or protected hooks such as `createRenderRoot()`, `setupConnection()`, `teardownConnection()`, or `update()` | subclass `GluonElement` | The class API exposes those extension points and a stable host identity. |
| Stateless template composition with no independent host or connection lifecycle | a functional component | It is a render function, not a Custom Element instance. |

Use `defineGluonElement()` for a new stateful component unless the component
needs one of the class extension points in the second row. Use
`elementProperty<Value>()` and `elementEvent<Detail>()` when a setup-based
definition needs structured generic types that a constructor cannot infer.

## Package and load a component library

A separately published library exposes ordinary public ESM exports plus a
serializable `ComponentLibraryManifest` from `@gluonjs/quarks`. Each manifest
entry names its public module, named export, layer, stylesheet ids,
dependencies, accessibility contract, and optional Custom Element tag and
Storybook story id. Validate untrusted JSON with
`validateComponentLibraryManifest()` before a consumer resolves any module.

Create the consumer-owned boundary with `createComponentLibraryLoader()`.
Its resolver imports only the requested declared entry and dependencies;
`status()` and `result()` expose loading, loaded, and failed state without
implicitly registering the whole library. Element entries register against the
selected registry, and duplicate tags with a different constructor fail.
Functional entries remain unregistered render functions.

When a loader receives both a style resolver and an explicit target, it retains
only the loaded entries' constructable sheets. `release()` and `dispose()`
release exactly those references while preserving sheets the target already
owned. `styleSnapshot()` and `validateStyleSnapshot()` carry the same ordered
style ids through SSR and hydration without replacing retained DOM. The loader
never introduces a `<style>` fallback.

The repository's `examples/component-library` package, clean consumer, and
Storybook catalog are the complete runnable reference. Storybook uses
`@gluonjs/gluon-components-vite` so stories return native Gluon templates and
receive exact canvas teardown without a Web Components adapter. The catalog
uses the published exports for controls, interactions, accessibility checks,
and visual baselines; it is developer evidence, not a replacement for the
GLUON GOODS application acceptance flow. See the
[complete Storybook guide](../../../../../docs/storybook.md).

## Declare properties

A `GluonElement` subclass can declare an input with `@property()` directly on
the field, or list it in the static `properties` object and add a matching
TypeScript `declare` field. Both forms create the same Gluon property contract.
Use one form consistently within a class. Decorators reduce duplication;
`static properties` remains useful when a project does not compile decorators.

| Declaration key | What it does | Default |
| --- | --- | --- |
| `type` | Uses the built-in `String`, `Number`, `Boolean`, `Object`, or `Array` attribute conversion. | No conversion hint. |
| `attribute` | Renames the attribute or disables attribute transport with `false`. Camel case otherwise becomes kebab case. | The kebab-case property name. |
| `reflect` | Writes an accepted property value back to its attribute. | `false` |
| `default` | Supplies the initial value. Use a factory for a fresh object or array per element. | No value. |
| `converter` | Replaces conversion from an attribute, to an attribute, or both. | The converter selected by `type`. |
| `hasChanged` | Decides whether a property write schedules an update. | `!Object.is(value, oldValue)` |
| `required` | Reports `GLUON_PROP_REQUIRED` when the element connects without a provided value or default. | `false` |
| `validate` | Returns `true` for a valid value or a diagnostic message for an invalid value. | No validation. |

Use an attribute for short serializable HTML configuration such as
`featured` or `quantity="2"`. Use a property binding for structured data:

```ts
html`<product-card .product=${product}></product-card>`;
```

The leading dot is significant: `.product` assigns the object to the element's
JavaScript property. `product=${product}` would be an attribute binding and
would cross the HTML string boundary instead.

A reflected value must have a stable text representation and be useful to CSS,
HTML inspection, or another platform consumer. Do not reflect application-owned
objects merely to duplicate them in markup.

### Decorator equivalents

Import decorators from the explicit public subpath:

```ts
import { customElement, property, state } from '@gluonjs/core/decorators';
```

| Decorator | Use it for | Equivalent without decorators |
| --- | --- | --- |
| `@customElement('product-card')` | Register a `GluonElement` subclass under a Custom Element tag. | `defineElement('product-card', ProductCard)` after the class. |
| `@property(options)` | Declare a public reactive field or `accessor`. It accepts the same options listed above. | An entry in `static properties` plus a matching `declare` field. |
| `@state(options)` | Declare private component-owned reactive state. It never reads an attribute and never reflects one. | A `static properties` entry with `attribute: false` and `reflect: false`, plus a private field. |

Prefer a normal class field such as `@property() label!: string` when Gluon
should own the accessor. An auto-accessor such as
`@property() accessor label = 'Ready'` is also supported. Use a `default`
factory for mutable values; a field initializer is evaluated once for each
element, while `default: () => value` follows the same explicit contract in
both authoring forms.

Standard TypeScript decorators are recommended. Do not enable
`experimentalDecorators`; keep `useDefineForClassFields` enabled. The official
Vite plugin performs the required browser transform:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({ plugins: [gluon()] });
```

An existing legacy-decorator project can use
`gluon({ decorators: 'legacy' })`, `experimentalDecorators: true`, and
`useDefineForClassFields: false`. Do not mix standard and legacy decorator
semantics in one build.

## Declare and emit events

The generic argument to `GluonElement<Events>` maps event names to their
`detail` types. The static `events` field supplies runtime behavior. Calling
`emit(name, detail)` validates the detail and dispatches a native
`CustomEvent`.

Event declaration defaults are deliberate:

- `bubbles: true` lets an ancestor listen without wiring every intermediate
  component;
- `composed: true` lets the event cross the component's Shadow DOM boundary;
- `cancelable: false` means `preventDefault()` has no effect until the component
  explicitly opts into cancellation;
- `validate` uses the same `true` or diagnostic-message contract as a property
  validator.

For a cancelable event, `emit()` returns `false` after a listener calls
`preventDefault()`. The emitting component can use that result to skip its
default follow-up action.

In a Gluon template, bind an event with `@event-name`. Pass `event(listener,
options)` when native `addEventListener` options such as `once`, `capture`,
`passive`, or `signal` are required. The renderer removes template listeners
when their owner is replaced, suspended, or unmounted. For an imperative
`addEventListener`, retain the callback and remove it during connection cleanup,
or supply an `AbortSignal` owned by that connection.

There is intentionally no event decorator. Event names and payloads form one
component-wide public contract, so keep the generic `GluonElement<Events>`, the
static `events` declaration, and `emit()` together. The `@event-name` syntax is
a template listener binding; it is not a TypeScript decorator.

## Complete compiled example

These two compiled examples implement the same public component boundary. The
first uses decorators; the second uses plain TypeScript with static declaration
objects. Both combine a structured property, primitive attributes, reflection,
validation, a typed cancelable event, a template listener, and native listener
options.

### Decorator form

<<< ../../../../examples/component-authoring-decorators.ts

### Plain TypeScript form

<<< ../../../../examples/component-authoring.ts

## Lifecycle and ownership

One element can disconnect and reconnect, so connection-owned work must not
live forever.

1. Construction creates the render root, installs property accessors, captures
   values assigned before Custom Element upgrade, and applies defaults.
2. Connection validates declared properties, adopts styles, creates the
   connection effect scope, runs `setupConnection()`, and queues the first
   render.
3. The first successful render runs `onConnected()` and then `onUpdated()`.
4. A later update runs `onBeforeUpdate()`, renders, and then runs `onUpdated()`.
5. Disconnection stops the connection scope, suspends rendered listeners and
   refs, runs `onDisconnected()`, and finally runs `teardownConnection()`.

`requestUpdate()` schedules a deduplicated render. `updateComplete` is the
promise for the currently scheduled render and resolves after its update hooks
finish. Declared property writes and reactive dependencies already schedule
updates; call `requestUpdate()` only after changing non-reactive state that the
template reads.

For setup-based components, register the equivalent work with
`context.onConnected()`, `context.onUpdated()`, `context.onDisconnected()`, and
`context.onCleanup()`. Setup executes once per connected lifetime; explicitly
keyed `state()` and `reactiveState()` values survive a reconnect.

## Public class map

Most application code needs only the first four classes. Error classes are
listed because applications may catch them or inspect their structured fields;
they are not alternative component bases.

### Application and reactivity classes

| Class | Use it for |
| --- | --- |
| [`GluonElement`](/gluon/1.3.0/api/generated/src/classes/GluonElement.html) | Subclass it for a stateful Custom Element that needs protected class extension points. |
| [`TemplateResult`](/gluon/1.3.0/api/generated/src/classes/TemplateResult.html) | This is the immutable result returned by `html`; return it from render code rather than constructing it directly. |
| [`EffectScope`](/gluon/1.3.0/api/generated/packages/reactivity/src/classes/EffectScope.html) | Group reactive effects and cleanup under one `stop()` boundary; `effectScope()` is the public factory. |
| [`StoreManager`](/gluon/1.3.0/api/generated/packages/store/src/classes/StoreManager.html) | Own Store definitions and live Store instances for one application, request, or test; create it with `createStoreManager()` and call `dispose()`. |

### Component-library classes

| Class | Use it for |
| --- | --- |
| [`ComponentLibraryLoader`](/gluon/1.3.0/api/generated/packages/quarks/src/classes/ComponentLibraryLoader.html) | Resolve an explicitly requested public component entry, observe cache state, retain target-owned constructable stylesheets, and validate request-local SSR style snapshots before hydration. |

### Tooling classes

| Class | Use it for |
| --- | --- |
| [`DevtoolsProtocol`](/gluon/1.3.0/api/generated/packages/devtools-api/src/classes/DevtoolsProtocol.html) | Register inspectable applications, record serializable timeline events, take snapshots, and subscribe a Devtools client. |
| [`GluonDevtoolsBridge`](/gluon/1.3.0/api/generated/packages/devtools/src/classes/GluonDevtoolsBridge.html) | Connect application, Router, Store, render, event, and error signals to `DevtoolsProtocol`; dispose it with its owner. |
| [`GluonLanguageService`](/gluon/1.3.0/api/generated/packages/language-server/src/classes/GluonLanguageService.html) | Analyze open TypeScript documents for Gluon diagnostics, completion, hover, definitions, rename edits, and semantic tokens. |
| [`GluonProtocolServer`](/gluon/1.3.0/api/generated/packages/language-server/src/classes/GluonProtocolServer.html) | Adapt `GluonLanguageService` to the repository's JSON-RPC/LSP message contract. |

### Error classes

| Class | Where it comes from |
| --- | --- |
| [`AsyncTimeoutError`](/gluon/1.3.0/api/generated/src/classes/AsyncTimeoutError.html) | An async component exceeded its configured timeout; inspect `timeout`. |
| [`HydrationMismatchError`](/gluon/1.3.0/api/generated/src/classes/HydrationMismatchError.html) | Core hydration found mismatches while recovery was configured as `throw`; inspect `mismatches`. |
| [`LegacyComponentStyleConflictError`](/gluon/1.3.0/api/generated/src/styles/classes/LegacyComponentStyleConflictError.html) | A legacy component stylesheet conflicts with usage-driven style ownership; inspect `componentStyleId`. |
| [`UiHydrationError`](/gluon/1.3.0/api/generated/packages/atoms/src/classes/UiHydrationError.html) | UI stylesheet hydration found missing, duplicate, reordered, or mismatched carriers; inspect `mismatch`. |
| [`GluonSfcCompileError`](/gluon/1.3.0/api/generated/packages/compiler/src/classes/GluonSfcCompileError.html) | Presentational `.gluon` compilation rejected malformed, stateful, or ambiguous source; inspect `code` and `filename`. |
| [`SsrRenderError`](/gluon/1.3.0/api/generated/packages/ssr/src/classes/SsrRenderError.html) | SSR received an invalid value or unsupported directive; inspect `code`. |
| [`ComponentStyleHydrationError`](/gluon/1.3.0/api/generated/packages/ssr/src/hydration/classes/ComponentStyleHydrationError.html) | Component stylesheet hydration reported a typed mismatch; inspect `mismatch`. |
| [`SsrTransportError`](/gluon/1.3.0/api/generated/packages/ssr/src/hydration/classes/SsrTransportError.html) | The hydration style transport is unsupported, malformed, or conflicts with recovery; inspect `code`. |
| [`AddComponentError`](/gluon/1.3.0/api/generated/packages/create-gluon/src/classes/AddComponentError.html) | `create-gluon` component generation rejected input or a filesystem safety condition; inspect `code`. |
| [`ScaffoldError`](/gluon/1.3.0/api/generated/packages/create-gluon/src/classes/ScaffoldError.html) | Project scaffolding rejected CLI options, a project name, or the target directory; inspect `code`. |
| [`VueMigrationAnalyzerError`](/gluon/1.3.0/api/generated/packages/vue-migration-analyzer/src/classes/VueMigrationAnalyzerError.html) | Vue migration analysis could not start or exceeded a resource budget; inspect `exitCode`. |

## Next references

- [Application architecture](../application/) for application, Router, and Store ownership.
- [Component contracts](https://github.com/marcmalerei/gluon/blob/main/docs/component-contracts.md) for the normative property, event, slot, model, and ref behavior.
- [Reactive Custom Elements](https://github.com/marcmalerei/gluon/blob/main/docs/reactive-elements.md) for scheduler and reconnection semantics.
- [API reference](/gluon/1.3.0/api/) for exact signatures and one compiled example per public symbol.
