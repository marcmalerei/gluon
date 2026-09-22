<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/vite.png" alt="@gluonjs/vite — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

# @gluonjs/vite

The official Vite plugin adds Gluon template source maps, development
diagnostics, and compatible state-preserving HMR.

<!-- gluon-package-overview:start -->
## @gluonjs/vite at a glance

**Runtime:** node · **Release:** 1.12.0

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/vite/) · [npm](https://www.npmjs.com/package/@gluonjs/vite) · [Source](https://github.com/marcmalerei/gluon/blob/main/packages/vite/README.md)

**Public API:** [`@gluonjs/vite`](https://marcmalerei.github.io/gluon/1.12.0/api/generated/packages/vite/src/) · [`@gluonjs/vite/tailwind`](https://marcmalerei.github.io/gluon/1.12.0/api/generated/packages/vite/src/tailwind/)

### Install

```sh
npm install @gluonjs/vite
```

### Quick start

```ts
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({ plugins: [gluon()] });
```

### Choose this package when

- Template source maps, development diagnostics, and HMR.
- Build-time integration for Gluon applications.
- Tooling support for browser-oriented packages.
- Optional Tailwind composition with deduplicated Shadow DOM SSR stylesheet assets.

**Choose another boundary when:**

- Does not own application runtime state or rendering semantics.
- Requires Vite and the public Core package.

### Related documentation

- [Presentational SFCs](https://marcmalerei.github.io/gluon/latest/guides/sfc-authoring/)
- [Tooling](https://marcmalerei.github.io/gluon/latest/guides/tooling/)
- [Deployment](https://marcmalerei.github.io/gluon/latest/guides/deployment/)

<!-- gluon-package-overview:end -->

```ts
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  plugins: [gluon()],
});
```

The same plugin compiles `.gluon` presentational Single-File Components before
ordinary module analysis; no second plugin is required. SFC script blocks are
transpiled with the configured TypeScript decorator mode, while generated code
uses ordinary public Gluon component, Quark, template, and stylesheet
contracts. See
[Presentational Single-File Components](https://marcmalerei.github.io/gluon/latest/guides/sfc-authoring/).

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

The packaged HMR client maps reference `src/client.ts`. That exact source file
ships with `@gluonjs/vite`, so Vite and browser-test diagnostics can resolve
`dist/client.js` and its declarations without a missing-source warning.

Set `universal: true` for a production client build. The plugin emits
`gluon-assets.json` with the hashed entry chunk, modulepreload imports, CSS, and
referenced assets consumed by `@gluonjs/ssr` and static generation. Pass
`universal: { manifestFile }` only when deployment requires another filename.
Build the server entry separately with Vite SSR; the canonical shop commands
are documented in [Static and server deployment](../../docs/deployment.md).

## Tailwind and Shadow DOM SSR

Use `gluonTailwind()` when the application imports Tailwind's CSS entry. It
composes Tailwind's official Vite plugin and enables the universal Shadow DOM
stylesheet manifest. `@tailwindcss/vite` is an optional peer dependency, so
projects that do not use Tailwind do not load it.

```ts
import { defineConfig } from 'vite';
import { gluonTailwind } from '@gluonjs/vite/tailwind';

export default defineConfig({ plugins: gluonTailwind() });
```

Import Tailwind once from the application entry (for example,
`import './tailwind.css'` where the file contains `@import "tailwindcss";`).
The generated `gluon-assets.json` then contains `shadowStyles`: immutable CSS
asset references with stable IDs and content digests. Pass that manifest to
`renderRequest()` and pass `assets.shadowStyles` to `hydrateApplication()` or
`hydrateElement()`.

For each Declarative Shadow DOM root, SSR writes only a compact `<link>` to the
same hashed CSS asset—never a second copy of Tailwind's generated CSS.
Hydration loads and validates each asset once per document, shares the resulting
constructed sheet among all participating roots, and removes the temporary
links only after retained hydration succeeds. A failed handoff leaves the links
in place. Configure `gluon({ universal: { shadowStyles: true } })` directly
when using another CSS generator that produces a single Shadow-safe CSS entry.

The default transform boundary is the Vite project root and excludes
`node_modules`. `include` accepts a regular expression or predicate when a
monorepo keeps application modules outside that root. Set `diagnostics: false`
only when another tool reports the same compiler diagnostics.

## License

MIT License, Copyright © 2026 Marc Malerei.
