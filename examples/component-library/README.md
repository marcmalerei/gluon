# Component-library consumer

This is a deliberately separate component-library and consumer example. It is
not a GLUON GOODS route or a replacement for the shop acceptance application.

The library uses only `@gluonjs/core` and `@gluonjs/quarks` public entry points:
`ProductBadge` is a stateless Atom and `example-product-picker` is a stateful
Custom Element. Its ShadowRoot owns a constructable stylesheet, native buttons
remain keyboard-operable, and its typed `change` event reports the exact new
quantity.

Run `npm run build:component-library` to build the consumer. Loader and
Storybook integration are intentionally delivered by issues #214 and #215.

## Storybook

Run `npm run storybook:component-library` for the separate developer catalog
or `npm run build:storybook:component-library` for its build smoke check.
Stories use the package entry point, expose controls, execute the real picker
interaction, and enable the accessibility addon. The catalog is not a
replacement for GLUON GOODS.

`library/` is the separately buildable `@gluonjs/example-component-library`
package boundary. Its implementation imports only the public Core and Quarks
entries; the example consumer imports the library package entry rather than
the source implementation. Run `npm run check:component-library-package` to
build it and inspect the exact tarball contents before a clean-consumer install.
`npm run check:component-library-clean-install` packs the real library and
Gluon dependencies, installs them in an empty temporary consumer, typechecks
and production-builds that consumer, then verifies its browser interaction and
teardown flow.
