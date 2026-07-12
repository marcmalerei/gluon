# `@gluonjs/compiler`

`@gluonjs/compiler` is Gluon's shared source-location and module-transform
foundation. It records `html` and `css` tagged-template boundaries and
interpolation locations, produces high-resolution source maps, and supplies the
development wrappers consumed by `@gluonjs/vite`.
Aliased `compose(Component, props)\`body\`` calls are recorded as template
boundaries with the same source-location and inline-style behavior as `html`.

The compiler does not turn templates into a private renderer format. Runtime
templates continue to use the public `html` and `css` APIs. Production
transforms retain source mappings and diagnostics without adding HMR imports.

Imported `defineGluonElement()` calls receive the functional Custom Element HMR
bridge. The compiler also reports source-located invalid autonomous tags,
listener/interval creation without setup cleanup ownership, and lifecycle
registration deferred beyond synchronous setup.

The public `@gluonjs/compiler/diagnostics` entry contains the versioned,
environment-neutral catalog used by the Language Server, Playground, Devtools
reference, compact production codes, and generated JSON documentation.

Inline `<style>` elements in `html` templates produce
`GLUON_TEMPLATE_STYLE_ELEMENT`; Gluon browser styling uses constructable
stylesheets and `adoptedStyleSheets` only.

## License

MIT License, Copyright © 2026 Marc Malerei.
