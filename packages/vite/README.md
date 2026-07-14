<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/vite.png" alt="@gluonjs/vite — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

The official Vite plugin adds Gluon template source maps, development
diagnostics, and compatible state-preserving HMR.

```ts
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  plugins: [gluon()],
});
```

The plugin also transpiles standard TypeScript decorators imported from
`@gluonjs/core/decorators`; no `experimentalDecorators` setting is required.
`@customElement()` participates in the same compatible Custom Element HMR path
as `defineElement()`. For an existing legacy-decorator codebase, configure
`gluon({ decorators: 'legacy' })` together with `experimentalDecorators: true`
and `useDefineForClassFields: false` in TypeScript.

In development, the plugin keeps exported functions and components behind
stable call proxies, preserves Store objects through `StoreManager.hotUpdate()`,
keeps registered Custom Element constructors stable, preserves functional
component `styles` metadata, and updates the contents
of already-adopted `CSSStyleSheet` instances. It then requests a render pass for
mounted Gluon applications and connected Gluon elements. The page is not
reloaded for compatible template, method, store-logic, or stylesheet edits.

The maintained `create-gluon --ui` HMR regression updates both the exported
`StarterAction` consumer and its app-token stylesheet after incrementing the
reactive count. It requires the same application state, native Button node, and
`CSSStyleSheet` object after the update, then verifies the new label and computed
token color before cleanup.

Imported `defineGluonElement()` calls use the same registered-constructor
bridge. Compatible edits stop the prior setup child scope and run patched setup
inside the existing render owner while retaining explicit keyed state,
`ElementInternals` form state, host, ShadowRoot, compatible template DOM, and
stylesheet identity.

A Custom Element superclass, form association, tag name, constructor/instance
field initialization, or public property/attribute, event, or slot schema change is not a
compatible edit. Such changes invalidate the HMR boundary and require a page
reload. Store IDs are also stable HMR identities.

`html` and `css` template boundaries and interpolation offsets receive
high-resolution source mappings. Runtime errors therefore resolve through
Vite's source-map pipeline to the author module and template expression.
Inline `<style>` elements produce `GLUON_TEMPLATE_STYLE_ELEMENT` diagnostics.

Production transforms retain source maps and template diagnostics but do not
inject the virtual HMR client, `import.meta.hot` handlers, stable proxies, or
module identity strings. The plugin defines `__GLUON_DEV__` as `false`, which
allows Rollup to remove Core render-debug branches from application bundles.

Set `universal: true` for a production client build. The plugin emits
`gluon-assets.json` with the hashed entry chunk, modulepreload imports, CSS, and
referenced assets consumed by `@gluonjs/ssr` and static generation. Pass
`universal: { manifestFile }` only when deployment requires another filename.
Build the server entry separately with Vite SSR; the canonical shop commands
are documented in [Static and server deployment](../../docs/deployment.md).

The default transform boundary is the Vite project root and excludes
`node_modules`. `include` accepts a regular expression or predicate when a
monorepo keeps application modules outside that root. Set `diagnostics: false`
only when another tool reports the same compiler diagnostics.

## License

MIT License, Copyright © 2026 Marc Malerei.
