# Component input, output, slot, model, and ref contract

Gluon's stateful component boundary is an autonomous `GluonElement`. Props are
JavaScript properties with optional attribute transport, public outputs are
native `CustomEvent` instances, projected content uses native slots, and refs
resolve to real DOM or Custom Element hosts. Functional components remain typed
functions without a second instance or lifecycle model.

## Template-native functional composition

`compose(component, props)\`body\`` is the optional nested authoring path for a
functional component whose props accept `children`. It invokes the same
function directly and passes an ordinary `html` result as `children`:

```ts
compose(AppShell, { header, navigation })`
  ${compose(Card, { title: 'Delivery', actions })`
    <label>Email <input name="email" type="email" required></label>
  `}
`;
```

TypeScript checks required, optional, callback, and excess props at the
`compose()` call. Named or scoped content remains a typed prop. The HTML body
may use native elements, bindings, spreads, models, refs, conditionals,
`repeat()`, or `Suspense()` exactly as any `html` template. Direct calls remain
supported. The accepted contract and measured limitations are in
[RFC 0004](rfcs/0004-template-native-functional-composition.md) and the
[comparison evidence](template-composition-evidence.md).

## Typed properties

Use `PropertyDeclarations<Props>` to check a component's declaration against its
public property interface:

```ts
interface CounterProps {
  count: number;
  label: string;
}

class GluonCounter extends GluonElement {
  static override readonly properties = {
    count: {
      type: Number,
      required: true,
      reflect: true,
      validate: (value) => value >= 0 || 'count must be non-negative',
    },
    label: { type: String, default: 'Count' },
  } satisfies PropertyDeclarations<CounterProps>;

  declare count: number;
  declare label: string;
}
```

The opt-in `@gluonjs/core/decorators` entry point declares the same runtime
contract directly on fields:

```ts
import { customElement, property, state } from '@gluonjs/core/decorators';

@customElement('gluon-counter')
class DecoratedGluonCounter extends GluonElement {
  @property({ type: Number, required: true, reflect: true,
    validate: (value: number) => value >= 0 || 'count must be non-negative' })
  count!: number;

  @property({ type: String, default: 'Count' })
  label!: string;

  @state({ default: false })
  private editing!: boolean;
}
```

`@customElement()` is equivalent to `defineElement()` after the class.
`@property()` accepts `PropertyDefinition`; `@state()` is the equivalent of a
property declaration with `attribute: false` and `reflect: false`. Event and
slot declarations remain static component-wide contracts.

Defaults, converters, attribute aliases, reflection, `hasChanged`, upgrade
precedence, and disconnected writes retain the behavior defined by the
[reactive element contract](reactive-elements.md). `required` checks whether a
property or mapped attribute was supplied; a default does not count as caller
input. A validator returns `true`, `false`, or a diagnostic string. Failed
validation emits `GLUON_PROP_INVALID` and keeps the value, so validation does
not silently change application state. Missing required input emits
`GLUON_PROP_REQUIRED`. A validator that throws enters the owning application's
error channel.

Undeclared attributes are host attributes. They remain on the Custom Element and
do not fall through into its ShadowRoot. Structured values, callbacks, nodes,
and functions use property bindings such as `.value=${value}`; attribute
serialization remains explicit.

## Typed events

Pass an event-detail map to `GluonElement` and check runtime metadata with
`EventDeclarations<Events>`:

```ts
interface CounterEvents {
  change: { value: number };
}

class GluonCounter extends GluonElement<CounterEvents> {
  static override readonly events = {
    change: {
      cancelable: true,
      validate: ({ value }) => Number.isFinite(value),
    },
  } satisfies EventDeclarations<CounterEvents>;

  commit(value: number): boolean {
    return this.emit('change', { value });
  }
}
```

The generic map rejects undeclared names and invalid detail values in component
source. Runtime declarations set default `bubbles`, `composed`, and
`cancelable` behavior and may validate detail. `bubbles` and `composed` default
to `true`; `cancelable` defaults to `false`. Call-specific `CustomEventInit`
values override declaration defaults. Failed validation warns with
`GLUON_EVENT_INVALID` but still dispatches the event. When a component publishes
an event declaration set, emitting another name warns with
`GLUON_EVENT_UNDECLARED`.

Consumers receive ordinary `CustomEvent` objects through native listeners.
Functional components expose callbacks or render an element that emits an
event; they do not own an event target.

## Native and scoped slots

Element components declare documentation and validation metadata with
`SlotDeclarations` and render platform `<slot>` elements:

```ts
class GluonPanel extends GluonElement {
  static override readonly slots = {
    header: { required: true, fallback: true },
    default: { fallback: true },
  } satisfies SlotDeclarations<'header' | 'default'>;

  protected render() {
    return html`
      <slot name="header"><h2>Untitled</h2></slot>
      <slot><p>Empty</p></slot>
    `;
  }
}
```

Required slots are checked after the first successful render of each connection;
an empty required slot warns with `GLUON_SLOT_REQUIRED`. Assignment,
`slotchange`, fallback display, and cleanup are native browser behavior. Light
DOM nodes remain owned by the consumer and are never claimed or replaced by
Gluon's ShadowRoot renderer.

Scoped slots are JavaScript-only functional-component arguments:

```ts
const row: ScopedSlot<{ label: string }> = ({ label }) => html`<li>${label}</li>`;
renderScopedSlot(row, { label: 'First' }, html`<li>Fallback</li>`);
```

`renderScopedSlot()` invokes the caller-owned function or returns its explicit
fallback. The surrounding renderer owns the resulting Parts and DOM.

## Two-way models

`model(writable, options)` returns a spread binding. The writable value may be a
Gluon reactivity `Ref` or any structural `{ value }` object:

```ts
const name = ref('Ada');
const accepted = ref(false);

html`
  <input ...=${model(name, { modifiers: { trim: true } })}>
  <input type="checkbox" ...=${model(accepted, { kind: 'checkbox' })}>
`;
```

| Kind | Controlled property | Update event and value |
| --- | --- | --- |
| `text` (default) | `value` | `input`; `change` with `lazy` |
| `checkbox` boolean | `checked` | `change` → boolean |
| `checkbox` array | `checked` for the supplied `value` | `change` → new array using `Object.is` membership |
| `radio` | `checked` for the supplied `value` | checked `change` → supplied value |
| `select` | `value` | `change` → string or string array for `multiple` |
| `custom` | `modelValue` by default | `update:modelValue` `CustomEvent.detail` by default |

`trim` removes surrounding whitespace from strings. `number` converts a
non-empty string with `Number.parseFloat` when conversion succeeds. `lazy`
changes only the text-model event. A supplied `transform(value, event)` runs
after built-in modifiers. Custom models may override `property`, `event`, and
`modifiersProperty`; their frozen modifier record is also assigned to
`modelValueModifiers` by default.

Model writes use native events and do not synthesize extra `input` or `change`
events when controlled values render back into a form control.

## Refs and public exposure

`elementRef<ElementType>()` creates an object ref for a real rendered element.
A structural object ref or callback may also be passed directly through a
spread's `ref` key. An element-component ref resolves to the stable Custom
Element host. A functional component has no component-instance ref; refs in its
result resolve to the concrete nodes rendered by its caller.

`exposedRef(target)` maps a component-host ref to the object published by the
element's protected `expose()` method. If renderer bindings run while template
content is still inert, this adapter waits for the already registered Custom
Element to upgrade before publishing the exposed object.

Replacing, clearing, suspending, or unmounting a renderer owner detaches an
active callback ref exactly once with `undefined` and clears an active object
ref. Reconnection may attach the same retained node again. Exposed values reveal
only the frozen public object; private ShadowRoot nodes and internal element
state remain inaccessible through that adapter.
