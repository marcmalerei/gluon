# API reference

TypeDoc generates this reference from every current export in
`package-contract.json`. The build fails when generation emits a warning, when
the documented entry-point count differs from the public package contract, or
when an internal link is broken.

New to Gluon? Start with [Components: properties, events, and lifecycle](../guides/components/)
before using the signature reference. Its class map explains which public class
to construct, subclass, receive as an error, or reserve for tooling.

## Runtime

- [`@gluonjs/core`](generated/src/)
- [`@gluonjs/core/styles`](generated/src/styles/)
- [`@gluonjs/reactivity`](generated/packages/reactivity/src/)
- [`@gluonjs/router`](generated/packages/router/src/)
- [`@gluonjs/router/memory`](generated/packages/router/src/memory/)
- [`@gluonjs/store`](generated/packages/store/src/)

## Universal rendering

- [`@gluonjs/ssr`](generated/packages/ssr/src/)
- [`@gluonjs/ssr/hydration`](generated/packages/ssr/src/hydration/)
- [`@gluonjs/ssr/static`](generated/packages/ssr/src/static/)
- [`@gluonjs/ssr/streaming`](generated/packages/ssr/src/streaming/)

## Tooling

- [`@gluonjs/compiler`](generated/packages/compiler/src/)
- [`@gluonjs/compiler/diagnostics`](generated/packages/compiler/src/diagnostics/)
- [`@gluonjs/vite`](generated/packages/vite/src/)
- [`@gluonjs/test-utils`](generated/packages/test-utils/src/)
- [`@gluonjs/devtools-api`](generated/packages/devtools-api/src/)
- [`@gluonjs/devtools`](generated/packages/devtools/src/)
- [`@gluonjs/language-server`](generated/packages/language-server/src/)
- [`create-gluon`](generated/packages/create-gluon/src/)

## Optional UI packages

- [`@gluonjs/quarks`](generated/packages/quarks/src/)
- [`@gluonjs/atoms`](generated/packages/atoms/src/)
- [`@gluonjs/molecules`](generated/packages/molecules/src/)
- [`@gluonjs/organisms`](generated/packages/organisms/src/)

Each package exports a machine-readable stable-contract manifest. The compiled
[interactive UI example](../examples/ui.html) exercises themes, controls,
compositions, and headless listbox keyboard behavior.
