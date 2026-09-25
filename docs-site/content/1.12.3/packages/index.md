---
title: Gluon packages
description: Choose a package by the capability and runtime boundary your application needs.
---

# Choose the package that owns the boundary

Gluon packages are intentionally composable. Begin with the smallest capability you need, keep application state and lifecycle ownership explicit, and add other packages only when the workflow calls for them.

| Package | Runtime | What it owns |
| --- | --- | --- |
| [@gluonjs/atoms](/1.12.3/packages/atoms/) | browser | Accessible focused UI primitives and reusable Gluon theme styles. |
| [@gluonjs/compiler](/1.12.3/packages/compiler/) | universal | Source transforms and template location tracking for Gluon tooling. |
| [@gluonjs/core](/1.12.3/packages/core/) | browser | Browser runtime and component ownership boundary for Gluon applications. |
| [@gluonjs/devtools](/1.12.3/packages/devtools/) | browser | Opt-in Gluon development bridge, browser inspector, and Vite integration. |
| [@gluonjs/devtools-api](/1.12.3/packages/devtools-api/) | universal | Versioned, environment-neutral Gluon Devtools protocol. |
| [@gluonjs/gluon-components-vite](/1.12.3/packages/gluon-components-vite/) | browser | Official Storybook renderer and Vite framework for Gluon components. |
| [@gluonjs/graph](/1.12.3/packages/graph/) | browser | Interactive, dependency-free network graph Custom Element for Gluon. |
| [@gluonjs/graphql](/1.12.3/packages/graphql/) | universal | Optional request-scoped GraphQL resources for SSR, hydration, and component-owned data loading. |
| [@gluonjs/i18n](/1.12.3/packages/i18n/) | browser | Locale-aware messages and lazy namespace loading for Gluon applications. |
| [@gluonjs/json-forms](/1.12.3/packages/json-forms/) | browser | Schema-driven, form-associated Custom Elements for Gluon. |
| [@gluonjs/language-server](/1.12.3/packages/language-server/) | node | Gluon template language service, LSP server, and CI checker. |
| [@gluonjs/molecules](/1.12.3/packages/molecules/) | browser | Accessible reusable UI compositions for Gluon. |
| [@gluonjs/organisms](/1.12.3/packages/organisms/) | browser | Accessible larger interface structures for Gluon. |
| [@gluonjs/quarks](/1.12.3/packages/quarks/) | browser | Typed native-element factories and headless interaction primitives for Gluon. |
| [@gluonjs/reactivity](/1.12.3/packages/reactivity/) | universal | DOM-free reactive state primitives for Gluon. |
| [@gluonjs/router](/1.12.3/packages/router/) | browser | Official Gluon router with browser, hash, and memory histories. |
| [@gluonjs/ssr](/1.12.3/packages/ssr/) | node | DOM-independent server rendering and request isolation for Gluon. |
| [@gluonjs/store](/1.12.3/packages/store/) | universal | Typed, application-scoped state management without a DOM dependency. |
| [@gluonjs/test-utils](/1.12.3/packages/test-utils/) | browser | Black-box component and application test helpers for Gluon. |
| [@gluonjs/vite](/1.12.3/packages/vite/) | node | Official Vite integration and state-preserving HMR for Gluon. |
| [@gluonjs/vue-migration-analyzer](/1.12.3/packages/vue-migration-analyzer/) | node | Static, report-only Vue 3.5 migration inventory for Gluon. |
| [create-gluon](/1.12.3/packages/create-gluon/) | node | Scaffold Gluon TypeScript applications and verified app-local components. |

## Build a complete application

- [Start with a working application](/1.12.3/guides/getting-started/)
- [Connect Router and Store](/1.12.3/guides/application/)
- [Render on the server and hydrate](/1.12.3/guides/universal-rendering/)
- [Compose accessible UI layers](/1.12.3/guides/components/)
- [Browse runnable recipes](/1.12.3/cookbook/)

Each package page identifies its runtime boundary, installation, quick start, non-goals, integrations, and generated public API.
