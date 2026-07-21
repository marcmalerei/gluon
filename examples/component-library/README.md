# Component-library consumer

This is a deliberately separate component-library and consumer example. It is
not a GLUON GOODS route or a replacement for the shop acceptance application.

The library uses only `@gluonjs/core` and `@gluonjs/quarks` public entry points:
`ProductBadge` is a stateless Atom and `example-product-picker` is a stateful
Custom Element. Its ShadowRoot owns a constructable stylesheet, native buttons
remain keyboard-operable, and its typed `change` event reports the exact new
quantity.

Run `npm run build:component-library` to build the consumer. It imports only
the serializable manifest initially, requests the badge and picker through
`createComponentLibraryLoader()`, displays observable loader state, and keeps
the two public component modules in distinct dynamic chunks. The badge sheet
is owned by the explicit document target; the picker's internal sheet remains
owned by its ShadowRoot.

`npm run check:component-library-loader-build` verifies the production Vite
manifest and browser requests from a clean checkout by building the required
Core, Compiler, and Vite workspaces first: the initial page requests only the
badge chunk,
the explicit picker action requests its chunk once, a repeated load is served
from the loader cache, and the loaded picker remains interactive. The retained
CI evidence includes raw chunk sizes, resource paths, browser version, and a
screenshot.

## Storybook

Run `npm run storybook:component-library` for the separate developer catalog
or `npm run build:storybook:component-library` for its build smoke check.
Stories use public package entry points, expose controls, execute the real
picker interaction, cover loading, cache-hit, and failed loader states, and
enable the accessibility addon. `npm run check:storybook:component-library`
builds the catalog, runs every retained interaction in Chromium, compares the
four story surfaces with the committed visual baselines, checks WCAG A/AA rules
with axe-core, and writes screenshots plus a machine-readable report to
`.tmp/quality-evidence`. Set
`UPDATE_STORYBOOK_SCREENSHOTS=1` only when intentionally reviewing and updating
those baselines. The catalog is not a replacement for GLUON GOODS.

`library/` is the separately buildable `@gluonjs/example-component-library`
package boundary. Its implementation imports only the public Core and Quarks
entries; the example consumer imports the library package entry rather than
the source implementation. Run `npm run check:component-library-package` to
build it and inspect the exact tarball contents before a clean-consumer install.
`npm run check:component-library-clean-install` packs the real library and
Gluon dependencies, installs them in an empty temporary consumer, typechecks
and production-builds that consumer, then verifies its browser interaction and
teardown flow.

Repository SSR coverage renders both public exports, including the picker's
declarative Shadow DOM. Browser coverage retains the Atom's server nodes during
hydration, confirms that picker styles remain owned by its ShadowRoot, verifies
repeat imports keep the identical registered constructor, and removes the
element during consumer teardown.
