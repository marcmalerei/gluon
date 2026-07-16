# Scoped Custom Element registries

Gluon supports explicit Custom Element ownership without changing its global
default. `createGluonElementRegistry()` creates one universal handle:

- a native independent `CustomElementRegistry` when the browser can associate
  one with a `ShadowRoot`;
- the document registry on unsupported browsers, preserving the same customer
  flow as a documented global fallback;
- an isolated definition table during SSR, where browser globals do not exist.

```ts
import {
  GluonElement,
  createGluonElementRegistry,
  defineElement,
  html,
} from '@gluonjs/core';

const productRegistry = createGluonElementRegistry();

class ProductStatus extends GluonElement {
  protected override render() {
    return html`<span>Ready to ship</span>`;
  }
}

defineElement('shop-product-status', ProductStatus, {
  registry: productRegistry,
});

class ProductPanel extends GluonElement {
  static override readonly shadowRootRegistry = productRegistry;

  protected override render() {
    return html`<shop-product-status></shop-product-status>`;
  }
}
```

`defineGluonElement()` accepts the same `registry` option and a separate
`shadowRootRegistry` option. Registration ownership and a component's internal
render-root ownership are deliberately separate.

## Browser fallback

`supportsScopedCustomElementRegistries()` reports whether a runtime has both a
constructable registry and ShadowRoot association. The default fallback is
`global`, because an unsupported browser must keep the application usable:

```ts
const registry = createGluonElementRegistry({ fallback: 'global' });
```

In fallback mode, definitions use `window.customElements`; therefore duplicate
tag names cannot coexist. `{ fallback: 'error' }` is available for applications
that require isolation and prefer an immediate descriptive failure.

Native scoped mode does not define entries in `window.customElements`. Two
different constructors may use the same tag only when each is registered in a
different registry and rendered in the matching ShadowRoot.

## SSR and hydration

`renderElement(Constructor, { registry })` selects an explicitly registered
server definition. Components with `static shadowRootRegistry` serialize:

```html
<template shadowrootmode="open" shadowrootcustomelementregistry>
```

On upgrade, `GluonElement` initializes that existing declarative ShadowRoot
with the matching native registry before hydration binds its DOM. A runtime
using the global fallback ignores scoped initialization and preserves the same
markup and interaction path. Request rendering retains no browser registry or
connected element instances.

## HMR and ownership

The Vite transform carries explicit `defineElement()` and
`defineGluonElement()` registry options into the HMR bridge. Hot records are
partitioned by registry identity, and only connected instances of the retained
constructor are refreshed. Changing tag or registry ownership requires a full
reload; compatible implementation and stylesheet edits retain the host and its
ShadowRoot.

Registry handles retain definitions for their lifetime but do not retain hosts,
roots, or rendered instances. Connection-owned effects and listeners continue
to stop and restart through the normal `GluonElement` lifecycle.

## Platform and polyfills

The public contract targets the current platform shape: constructable
`CustomElementRegistry`, the `customElementRegistry` ShadowRoot option, the
`ShadowRoot.customElementRegistry` association, and `registry.initialize()` for
declarative roots. A polyfill may expose that complete shape before Gluon loads.
Gluon does not patch DOM globals itself. Partial implementations fail feature
detection and use the selected fallback.

