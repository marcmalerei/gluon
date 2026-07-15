# Viewport virtualization

`createVirtualizer()` renders a bounded, accessible vertical list or grid while
retaining stable item keys. The controller owns its viewport through a callback
ref, measures rendered rows with the viewport realm's `ResizeObserver`, keeps
the visible scroll anchor stable when earlier measurements change, and exposes
the current item range as a readonly reactive ref.

```ts
import { createVirtualizer, html } from '@gluonjs/core';

const inventory = Array.from({ length: 1_000 }, (_, index) => ({
  id: `sku-${index}`,
  name: `Product ${index + 1}`,
}));

const products = createVirtualizer({
  items: inventory,
  key: (product) => product.id,
  renderItem: (product) => html`<a href=${`/products/${product.id}`}>${product.name}</a>`,
  estimateSize: 72,
  overscan: 2,
  ssrCount: 12,
  ariaLabel: 'Product inventory',
  class: 'inventory-viewport',
});

export const Inventory = () => products.view();
```

Give the viewport class a bounded block size; the returned view owns
`overflow:auto` and positioning. `layout: 'grid'` plus a positive `columns`
value renders semantic rows and grid cells. The controller publishes
`aria-posinset`/`aria-setsize` for lists and row/column metadata for grids.
Arrow keys, Home, and End move through the logical collection, including items
outside the current DOM window. A focused item remains represented until focus
moves, preventing focus loss during scrolling.

`estimateSize` may be a number or an item-specific function. Rendered rows
replace estimates with live measurements; viewport resizes and scroll events
recalculate the window on one animation frame. `update()` accepts reordered,
inserted, removed, short, or empty collections while retaining measurements by
stable item key. `scrollToIndex()` provides programmatic navigation and rejects
out-of-range indexes.

On the server, `view()` emits the first `ssrCount` items, complete semantics,
and the estimated spacer size. The same deterministic window hydrates in place.
In environments without `ResizeObserver`, estimated sizing and scrolling remain
functional. Clear the callback ref or call `stop()` to release listeners,
observers, measurements, and queued animation frames; `stop()` is permanent.

GLUON GOODS currently contains four products, all of which fit in its canonical
catalog viewport. Virtualizing that route would add scrolling and focus
complexity without reducing meaningful DOM work, so the shop intentionally
keeps its complete catalog markup. The production-like 100-item browser fixture
and 20-item SSR fixture provide the acceptance surface until real catalog volume
justifies using the public API in the customer journey.
