# `@gluonjs/compiler`

`@gluonjs/compiler` is Gluon's shared source-location and module-transform
foundation. It records `html` and `css` tagged-template boundaries and
interpolation locations, produces high-resolution source maps, and supplies the
development wrappers consumed by `@gluonjs/vite`.

The compiler does not turn templates into a private renderer format. Runtime
templates continue to use the public `html` and `css` APIs. Production
transforms retain source mappings and diagnostics without adding HMR imports.

Inline `<style>` elements in `html` templates produce
`GLUON_TEMPLATE_STYLE_ELEMENT`; Gluon browser styling uses constructable
stylesheets and `adoptedStyleSheets` only.

## License

MIT License, Copyright © 2026 Marc Malerei.
