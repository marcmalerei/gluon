<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/compiler.png" alt="@gluonjs/compiler — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

`@gluonjs/compiler` is Gluon's shared source-location and module-transform
foundation. It records `html` and `css` tagged-template boundaries and
interpolation locations, produces high-resolution source maps, and supplies the
development wrappers consumed by `@gluonjs/vite`.
Aliased `compose(Component, props)\`body\`` calls are recorded as template
boundaries with the same source-location and inline-style behavior as `html`.
Imports from `@gluonjs/core/decorators` are detected explicitly. The compiler
exposes the standard/legacy TypeScript decorator transpilation used by the Vite
plugin and rewrites `@customElement()` to the registered-element HMR bridge in
development.

The compiler does not turn templates into a private renderer format. Runtime
templates continue to use the public `html` and `css` APIs. In production it
may attach internal metadata to one statically proven `GluonElement` shape: a
direct fixed `html` return with exactly one declared primitive property in text
position and, optionally, a private readonly event-handler field. This lets the
runtime update that text Part without recreating the TemplateResult. Conditions,
attributes, directives, multiple dynamic text values, mutable/public secondary
bindings, inherited element bases, and custom `update()` methods are not marked.
All production transforms retain source mappings and diagnostics without
adding HMR imports.

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

## Presentational SFC compiler

`compileGluonSfc(source, { filename })` lowers a `.gluon` presentational
Single-File Component to ordinary public Core and Quark calls. The maintained
application path is the official `@gluonjs/vite` plugin, which recognizes
`.gluon` files automatically and transpiles their typed script blocks.

The compiler supports typed script, one annotated template, identifier
interpolation, a default slot, a prop-driven conditional native root, and one
owned constructable stylesheet. It rejects stateful or ambiguous forms instead
of adding a second runtime. See
[the task-oriented SFC guide](../../docs/sfc-authoring.md).

## License

MIT License, Copyright © 2026 Marc Malerei.
