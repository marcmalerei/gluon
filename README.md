<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/core.png" alt="@gluonjs/core — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->



# Gluon

Build interfaces on browser-native primitives with focused packages for
rendering, state, routing, server rendering, UI composition, and tooling.
Gluon keeps application ownership explicit and exposes supported capabilities
through documented public package entry points.

Start with [`npm create gluon@latest`](https://marcmalerei.github.io/gluon/latest/guides/getting-started/),
try the [browser Playground](https://marcmalerei.github.io/gluon/playground/),
or inspect the maintained [GLUON GOODS application](examples/shop). The
documentation, package guides, and examples follow the same public API path so
an experiment can become a real application without changing programming
models.

<!-- gluon-package-overview:start -->
## @gluonjs/core at a glance

**Runtime:** browser · **Release:** 1.12.2

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/core/) · [npm](https://www.npmjs.com/package/@gluonjs/core) · [Source](https://github.com/marcmalerei/gluon/blob/main/README.md)

**Public API:** [`@gluonjs/core`](https://marcmalerei.github.io/gluon/1.12.2/api/generated/src/) · [`@gluonjs/core/decorators`](https://marcmalerei.github.io/gluon/1.12.2/api/generated/src/decorators/) · [`@gluonjs/core/styles`](https://marcmalerei.github.io/gluon/1.12.2/api/generated/src/styles/)

### Install

```sh
npm install @gluonjs/core
```

### Quick start

```ts
import { createApp, html } from '@gluonjs/core';

createApp(() => html`<main>Hello Gluon</main>`).mount(document.body);
```

### Choose this package when

- Functional components and stateful custom elements.
- Application mounting, rendering, and event ownership.
- Style transport and public component helpers.

**Choose another boundary when:**

- Does not bundle application features such as routing or storage.
- Applications should import only public entry points, not repository source paths.

### Related documentation

- [Getting started](https://marcmalerei.github.io/gluon/latest/guides/getting-started/)
- [Components](https://marcmalerei.github.io/gluon/latest/guides/components/)

<!-- gluon-package-overview:end -->

## Start here

Create a new application with the interactive project generator:

```sh
npm create gluon@latest my-app
```

Or start with Core in an existing browser application:

```ts
import { createApp, html } from '@gluonjs/core';

const app = createApp(() => html`
  <main>
    <h1>Hello Gluon</h1>
    <p>Native elements, explicit application ownership.</p>
  </main>
`);

app.mount(document.querySelector('#app')!);
```

## Build a complete application

Follow the docs in order, or jump straight to the task at hand:

- [Getting started](https://marcmalerei.github.io/gluon/latest/guides/getting-started/) — install, run, and build a first application.
- [Learning path](https://marcmalerei.github.io/gluon/latest/guides/learning-path/) — a guided progression from templates to full application ownership.
- [Application architecture](https://marcmalerei.github.io/gluon/latest/guides/application/) — connect Router, Store, plugins, and lifecycle.
- [Cookbook](https://marcmalerei.github.io/gluon/latest/cookbook/) — runnable examples, including package combinations.
- [Package guide](https://marcmalerei.github.io/gluon/latest/packages/) — compare package purpose, runtime, dependencies, examples, and API.
- [API reference](https://marcmalerei.github.io/gluon/latest/api/) — version-matched public entry points and symbols.

The maintained [GLUON GOODS shop](examples/shop) is the real application
acceptance surface for capabilities that have an honest customer-facing use.
The [browser Playground](https://marcmalerei.github.io/gluon/playground/) is a
separate place to explore templates and package examples interactively.

## Package map

| Area | Packages | Typical use |
| --- | --- | --- |
| Application foundation | `@gluonjs/core`, `@gluonjs/reactivity`, `@gluonjs/router`, `@gluonjs/store`, `@gluonjs/ssr`, `@gluonjs/i18n` | Render and own application UI, state, navigation, locale, and server requests. |
| User interface | `@gluonjs/quarks`, `@gluonjs/atoms`, `@gluonjs/molecules`, `@gluonjs/organisms`, `@gluonjs/json-forms`, `@gluonjs/graph` | Compose native controls, accessible patterns, larger structures, forms, and relationship views. |
| Build and quality | `@gluonjs/compiler`, `@gluonjs/vite`, `@gluonjs/gluon-components-vite`, `@gluonjs/test-utils` | Compile templates, develop with Vite, document components in Storybook, and test public behavior. |
| Diagnostics and tools | `@gluonjs/devtools-api`, `@gluonjs/devtools`, `@gluonjs/language-server`, `@gluonjs/vue-migration-analyzer`, `create-gluon` | Inspect, analyze, scaffold, and migrate applications without private runtime imports. |

Packages are optional unless an application uses their capability. Start with
the smallest boundary that solves the task; each package page documents its
runtime, public API, peer dependencies, limits, and examples.

## Platform principles

- **Native output:** components render semantic HTML and standards-based Custom Elements.
- **Explicit ownership:** applications own setup, cleanup, providers, persistence, and request boundaries.
- **Composable packages:** higher UI layers depend downward; Core does not absorb optional UI, routing, or form features.
- **Public imports only:** application code uses documented package exports, never repository source paths or private deep imports.
- **Constructable stylesheets:** browser styling uses `CSSStyleSheet` and `adoptedStyleSheets` without a `<style>` fallback.

## Release and stability

The root package and official packages follow the current lockstep release line.
The release workflow publishes only from a protected immutable tag. Check the
[release archive](https://marcmalerei.github.io/gluon/latest/migration/upgrade/)
and each package page for the exact supported contract before upgrading.

Gluon documents compatibility in three categories:

- stable: the public package surfaces
- experimental: RFC-backed or opt-in surfaces
- unsupported: behaviors that the contract documents reject

Historical RFC decisions remain preserved with their scope and rationale.
Experimental does not mean silently enabled, and unsupported behavior is not a
compatibility promise.

## Development

Use Node `^22.12.0 || ^24.0.0` and npm from a clean checkout:

```sh
npm ci
npm run check
```

For documentation work, run the local VitePress site with `npm run docs:dev`
and the full static-site checks with `npm run check:docs`. See
[`docs-site/README.md`](docs-site/README.md) for the source layout, Pages build,
versioning, and validation pipeline.

## Performance evidence

Reproducible browser matrices, raw samples, and their interpretation limits are
maintained in [performance evidence](docs/performance.md). Measurements are
specific to their recorded hardware and workloads; they are not a claim of
universal framework superiority.

## Contributing

Read the [contribution guide](CONTRIBUTING.md), repository policy, and the
documentation for the package or workflow being changed. Public API changes
require matching package docs, runnable examples, tests, and an honest shop
integration when the capability has a customer-facing use.

## License

MIT — see [LICENSE](LICENSE).
