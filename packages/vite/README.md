# `@gluonjs/vite`

The official Vite plugin adds Gluon template source maps, development
diagnostics, and compatible state-preserving HMR.

```ts
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  plugins: [gluon()],
});
```

In development, the plugin keeps exported functions and components behind
stable call proxies, preserves Store objects through `StoreManager.hotUpdate()`,
keeps registered Custom Element constructors stable, and updates the contents
of already-adopted `CSSStyleSheet` instances. It then requests a render pass for
mounted Gluon applications and connected Gluon elements. The page is not
reloaded for compatible template, method, store-logic, or stylesheet edits.

A Custom Element superclass, form association, tag name, constructor/instance
field initialization, or public property/attribute schema change is not a
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

The default transform boundary is the Vite project root and excludes
`node_modules`. `include` accepts a regular expression or predicate when a
monorepo keeps application modules outside that root. Set `diagnostics: false`
only when another tool reports the same compiler diagnostics.

## License

MIT License, Copyright © 2026 Marc Malerei.
