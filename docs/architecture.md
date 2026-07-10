# Gluon architecture

Gluon separates its renderer, browser integration, and UI vocabulary so each public entry point can remain small and tree-shakable.

## Source layout

```text
src/
├── runtime.ts          Template results, compiler plans, Parts, spreading, render
├── element.ts          Reactive Custom Element base and definition helper
├── component.ts        Atom, Molecule, and Organism metadata helpers
├── props.ts            Class/style-aware prop merging
├── styles/             Constructable stylesheet creation and adoption
├── quarks/             Typed q.<tag>() native-element factories
├── atoms/              Icon, Button, Input, Label
├── molecules/          Card, FormField
└── organisms/          AppShell
```

The package builds separate ESM entry points for `gluon`, `gluon/styles`, `gluon/quarks`, `gluon/atoms`, `gluon/molecules`, and `gluon/organisms`.

## Runtime contract

`html` and `svg` return immutable-shape `TemplateResult` objects. A template is compiled once per `TemplateStringsArray` and cached in a `WeakMap`.

Compilation stores direct child-node paths for every dynamic Part. Cloned templates instantiate Parts from those cached paths instead of walking the complete clone. Each descriptor also stores its original expression index, so DOM attribute ordering does not control value ordering.

The runtime currently has three Part types:

- `NodePart` updates children, nested templates, DOM nodes, and arrays.
- `AttributePart` handles attributes plus `.property`, `?boolean`, and `@event` prefixes.
- `SpreadPart` reconciles prop objects, including classes, style maps, `data`, `aria`, events, and refs.

Event listeners and refs are disconnected when a binding changes or a template is replaced. Spread sub-maps remove only attributes or style properties previously owned by that Part.

## Template constraints

Each expression must be either a complete child expression or a complete attribute value:

```ts
html`<div class=${className}>${children}</div>`;
```

Partial attribute interpolation is intentionally rejected:

```ts
// Unsupported
html`<div class="prefix ${state}"></div>`;
```

Compose the full string first. This keeps compilation deterministic and avoids a second string-interpolation subsystem inside attribute Parts.

## Custom Elements

The accepted long-term division between stateful element components and
stateless functional components is defined in
[RFC 0002](rfcs/0002-unified-component-model.md). This section describes the
current implementation of those two roles; the RFC separately records known
prototype gaps and the required Gluon 1.0 contract.

`GluonElement` finalizes declared property accessors once per constructor. It supports:

- attribute names and opt-out
- String, Number, Boolean, Object, and Array conversion
- defaults and custom converters
- change predicates
- property-to-attribute reflection
- microtask-batched rendering
- `updateComplete`
- inherited constructable stylesheets

Every instance renders into an open ShadowRoot. Component styles are always adopted `CSSStyleSheet` instances.

## Styling invariant

Gluon does not create or inject `<style>` elements. `css` creates a `CSSStyleSheet`; `adoptStyles` and `unadoptStyles` manage `adoptedStyleSheets` while preserving unrelated sheets.

This is a deliberate browser baseline. A browser without constructable and adopted stylesheet support receives a descriptive error.

## Quark DX

The Tiny-Lit snapshot contained more than one hundred nearly identical per-tag Quark modules. Gluon replaces them with one typed proxy:

```ts
q.button({ children: 'Save' });
q.section({ children: q.h2({ children: 'Overview' }) });
```

The type of `q` maps every key in `HTMLElementTagNameMap` to a cached factory. `quark('my-element')` covers custom elements. Void elements reject children.

## UI layers

Atoms, Molecules, and Organisms are ordinary render functions with explicit metadata. They all return `TemplateResult` and compose through Quarks; there is no second component runtime.

They have no host, state instance, or lifecycle of their own. Stateful and
publicly interoperable components use `GluonElement`; their render methods may
compose any of these functional layers.

Layer styles are exported as constructable sheets and must be adopted explicitly. This avoids import-time DOM mutation and keeps application stylesheet ownership visible.

## Verification boundaries

The browser suite verifies DOM identity, nested templates, arrays, all binding forms, spread cleanup, refs, Custom Element properties and reflection, SVG namespaces, Quark factories, layer composition, and stylesheet adoption.

The suite does not constitute a comparative performance benchmark. Performance claims require a separate reproducible benchmark design and baseline implementations.
