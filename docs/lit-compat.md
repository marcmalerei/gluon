# Lit lifecycle compatibility

`@gluonjs/core/compat/lit` is an opt-in migration bridge for stateful Lit
components. It provides familiar lifecycle names while Gluon continues to own
the Custom Element connection scope, renderer, scheduler, update completion,
error routing, and cleanup.

The compatibility layer is not the preferred authoring style for new Gluon
components. Import it only for a component that is being migrated, then move
the lifecycle work to Gluon's native hooks when practical.

## Lifecycle mapping

| Lit name | Compatibility behavior | Native Gluon target |
| --- | --- | --- |
| `connectedCallback()` | Platform callback; call `super` | `onConnected()` |
| `firstUpdated(changed)` | After the first successful render of each connection | `onConnected()` |
| `willUpdate(changed)` | Before every Gluon render, including the first render of a connection | `onBeforeUpdate()` for later renders, or guarded work in `render()` when appropriate |
| `updated(changed)` | After every successful render | `onUpdated()` |
| `disconnectedCallback()` | Platform callback; call `super` | `onDisconnected()` and `onCleanup()` |
| `updateComplete` | Inherited Gluon completion promise | `updateComplete` |
| `requestUpdate()` | Schedules the native Gluon update | `requestUpdate()` or reactive/property writes |

`changed` is a read-only map of old values collected for the current Gluon
update pass. Multiple writes to the same declared property retain the value
from before the batch. An explicit `requestUpdate(name, oldValue)` accepts the
Lit arguments for migration ergonomics, but Gluon uses the actual declared
property changes it observes.

## Lit to compatibility layer

This realistic example keeps a subscription owned by the platform lifecycle
and initializes a DOM-dependent slider only after the first render:

```ts
import { LitCompatElement, type LitChangedProperties } from '@gluonjs/core/compat/lit';
import { defineElement, html } from '@gluonjs/core';

class ProductCard extends LitCompatElement {
  static override readonly properties = {
    productId: { type: String, required: true },
  };

  declare productId: string;
  private unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = productStore.subscribe(this.productId, () => this.requestUpdate());
  }

  firstUpdated() {
    this.initializeSlider(this.shadowRoot?.querySelector('[data-slider]'));
  }

  willUpdate(changed: LitChangedProperties) {
    if (changed.has('productId')) this.prepareProduct(changed.get('productId'));
  }

  updated(changed: LitChangedProperties) {
    if (changed.has('productId')) this.reportProductView();
  }

  disconnectedCallback() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected override render() {
    return html`<article data-slider>${this.productId}</article>`;
  }
}

defineElement('product-card', ProductCard);
```

Every override that replaces a Custom Element platform callback must call
`super`. Gluon's `onDisconnected()` and scope cleanup still own render
listeners, reactive effects, and directives; the example's explicit store
subscription is application-owned and therefore has an explicit release.

## Compatibility layer to idiomatic Gluon

The long-term Gluon form registers connection-owned work in the constructor:

```ts
import { GluonElement, defineElement, html } from '@gluonjs/core';

class ProductCard extends GluonElement {
  static override readonly properties = {
    productId: { type: String, required: true },
  };

  declare productId: string;

  constructor() {
    super();

    this.onConnected(() => {
      this.subscribe();
      this.initializeSlider();
    });

    this.onBeforeUpdate(() => {
      // Prepare work before later updates in this connection.
    });

    this.onUpdated(() => {
      // Observe the committed DOM after every successful update.
    });

    this.onDisconnected(() => {
      this.unsubscribe();
    });
  }

  protected override render() {
    return html`<article data-slider>${this.productId}</article>`;
  }
}

defineElement('product-card', ProductCard);
```

The APIs are intentionally not identical. Gluon's native `onConnected()` runs
after the first render, so DOM initialization belongs there when migrating
from `firstUpdated()`. Gluon's `onBeforeUpdate()` excludes the first render;
use a small connection guard or `render()` for work that must also run during
initial rendering. `firstUpdated()` in this bridge runs once per Gluon
connection, including after a disconnect/reconnect. This is the lifecycle
boundary exposed by Gluon and should be treated as a migration aid rather than
a promise of complete Lit scheduling equivalence.
