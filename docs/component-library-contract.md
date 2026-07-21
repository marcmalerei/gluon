# Component-library manifest and loader contract

This document specifies the public boundary for an optional Gluon component
library. It is a contract, not an implementation guide for importing arbitrary
application code. The canonical customer acceptance surface remains GLUON
GOODS; a library explorer or Storybook is developer evidence only.

## Manifest

Libraries publish a serializable `ComponentLibraryManifest` from
`@gluonjs/quarks`. Its version is currently `1`. Every entry has a stable
library-local `id`, a bare public ESM `module` specifier, named `exportName`,
layer, exact stylesheet ids, dependency ids, and an accessibility summary.
An `element` entry additionally supplies one unique custom-element `tag`.

```ts
import { type ComponentLibraryManifest } from '@gluonjs/quarks';

export const manifest = {
  schemaVersion: 1,
  name: '@acme/shop-components',
  entries: [{
    id: 'product-configurator',
    module: '@acme/shop-components/product-configurator',
    exportName: 'ProductConfigurator',
    layer: 'element',
    tag: 'acme-product-configurator',
    styles: ['acme-product-configurator'],
    dependencies: ['purchase-action'],
    accessibility: 'Uses labelled native choices and exposes an add event.',
    storyId: 'product-configurator--default',
  }],
} as const satisfies ComponentLibraryManifest;
```

Consumers must call `validateComponentLibraryManifest()` before using JSON from
outside their trusted build. Validation performs no import or registration.
Manifest ids, element tags, and module/export targets are public compatibility
surface; a breaking rename requires a major version.

## Loader requirements

The public loader resolves only a consumer-requested entry and its declared
dependencies. It exposes its load state, cached result, and failure explicitly;
it must not register an entire library as an import side effect. It may resolve
only declared bare public module specifiers and named public exports.

For an element it must first check the selected registry: an existing identical
constructor is a cache hit, while a different constructor for the same tag is a
reported duplicate-registration error. Functional entries never register a
custom element.

Styles are constructable sheets owned by an explicit target-scoped owner. A
loader retains exactly the requested entry styles, returns a disposal handle,
and releases exactly those references once the consumer tears down. A sheet
already adopted by the target before the loader retains it remains owned by the
target and is never removed by that loader. It must not use a `<style>`
fallback. SSR must retain the selected stylesheet ids in its request-local
manifest; hydration must validate and hand off the same ordered ids without
replacing retained DOM.

`createComponentLibraryLoader(manifest, resolver, options?)` is the public loader core.
The consumer-owned resolver receives only the requested validated record; this
keeps bundler import maps explicit and makes cache state observable through
`status(id)`. Supplying both `options.styles` and `options.styleTarget` makes
stylesheet ownership explicit: the resolver returns constructable sheets only
for the loaded entry, while `release(id)` and `dispose()` release precisely
those retained references. Package authors, bundlers, SSR adapters, and applications retain
authority over imports, registries, style roots, cache lifetime, error
reporting, and disposal.

`styleSnapshot()` returns the request-local library name and ordered style ids
for successfully loaded entries without requiring a DOM. SSR serializes that
value alongside its own request state. After the client loads the same entries
and adopts their sheets at the explicit target, `validateStyleSnapshot()` must
accept the server value before hydration proceeds. A library mismatch, schema
mismatch, missing, extra, or reordered style id aborts the handoff; the loader
does not replace server DOM as recovery.

## Verification boundary

`npm run typecheck:ui` compiles the public manifest API. `npm run
check:ui-contract` retains the existing official UI inventory. `npm run
check:component-library-loader-build` first builds the Core, Compiler, and Vite
workspace prerequisites so the check is reproducible from a clean checkout,
then retains the exact dynamic entry chunks,
the initial and post-request browser resource lists, one cache hit, the public
interaction result, browser metadata, and a rendered screenshot.
