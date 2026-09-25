# Lit and Web Components to Gluon

Gluon is also built on browser Custom Elements, Shadow DOM, native events, and
constructable stylesheets. The migration is conceptual rather than a
search-and-replace operation: keep the host and platform contract, then map
ownership and scheduling deliberately.

| Lit/Web Components concept | Closest Gluon concept | Important difference |
| --- | --- | --- |
| `LitElement` | `GluonElement` or `defineGluonElement()` | Gluon owns a connection effect scope and native template parts. |
| `render()` | `render()` or setup `render()` | Return a Gluon `TemplateResult`; do not mutate DOM as the normal render path. |
| `@property` | `static properties` or `@property()` | Conversion, validation, defaults, and reflection use Gluon's declaration contract. |
| `@state` | `@state()` or `context.state()` | State is private and never transported as an HTML attribute. |
| `connectedCallback()` | `onConnected()` / `context.onConnected()` | Gluon runs the hook after the first successful render. |
| `firstUpdated()` | `onConnected()` | Both are post-first-render work, but the Gluon hook is connection-scoped. |
| `willUpdate()` | `onBeforeUpdate()` | The native Gluon hook excludes the first render. |
| `updated()` | `onUpdated()` | It runs after a successful Gluon render. |
| `disconnectedCallback()` | `onDisconnected()` plus cleanup | Render-owned listeners are cleaned automatically; imperative work is still yours. |
| `requestUpdate()` | Reactive/property writes or `requestUpdate()` | Prefer changing declared/reactive state; manual scheduling is for non-reactive reads. |
| `updateComplete` | `updateComplete` | It resolves after the current Gluon update hooks. |
| Lit directives | Gluon built-ins and template bindings | Verify cancellation, identity, SSR, and cleanup; names are not interchangeable. |

## Questions to answer before porting

- Is this code a real Custom Element, or only a functional template? If it
  needs a host, lifecycle, or plain-HTML usage, keep a Custom Element boundary.
- Where does state belong: an input property, component-local state, or an
  application Store? Do not turn an application Store into process-global live
  state.
- Does the work need the DOM? Move it to `onConnected()` or `onUpdated()` and
  release subscriptions/timers in `onCleanup()`.
- Does the event cross Shadow DOM? Use Gluon's typed native event declaration and
  verify bubbling/composed/cancelable behavior explicitly.

For an opt-in compatibility bridge while a component is being migrated, read
the [Lit lifecycle compatibility reference](https://github.com/marcmalerei/gluon/blob/main/docs/lit-compat.md).
New components should use the native Gluon hooks once the migration is stable.
