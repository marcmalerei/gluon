# Gluon 1.0 roadmap

This roadmap defines the work required for Gluon to become a production-ready
alternative to Vue while preserving Gluon's own architecture: Custom Elements,
HTML template literals, first-class attribute spreading, and adopted
stylesheets.

GitHub is the source of truth for delivery status:

- [Gluon 1.0 tracker](https://github.com/marcmalerei/gluon/issues/42)
- [Open roadmap issues](https://github.com/marcmalerei/gluon/issues?q=is%3Aissue%20is%3Aopen%20label%3Aroadmap)
- [Milestones](https://github.com/marcmalerei/gluon/milestones)

The accepted product and component boundaries are defined by
[RFC 0001: Gluon 1.0 product scope and non-goals](rfcs/0001-gluon-1.0-product-scope.md)
and [RFC 0002: Unified component and Custom Element model](rfcs/0002-unified-component-model.md).
The supported environments and style transport are defined by
[ADR 0001: Browser, runtime, and style transport contract](adrs/0001-browser-runtime-and-style-transport.md).
The package graph, authorized license, versioning, release, and supply-chain
rules are defined by
[ADR 0002: Package, release, and supply-chain governance](adrs/0002-package-release-and-supply-chain-governance.md).

This document records the product contract, dependency order, milestone exit
criteria, and release gates. Individual issues contain the authoritative
implementation scope, acceptance criteria, and dependency links.

## What “a Vue alternative” means

Gluon 1.0 must let a developer build, inspect, test, server-render, hydrate,
deploy, and maintain a production application without Vue. It does not require
Vue source or API compatibility.

The target includes:

- declarative rendering driven by independently reusable reactive state
- typed components with props, events, slots, models, refs, context, and lifecycle
- an application runtime with plugins, error handling, routing, and shared state
- async components, loading boundaries, portals, cached views, and transitions
- scaffolding, Vite integration, HMR, language tooling, Devtools, and test utilities
- client rendering, server rendering, hydration, streaming, and static generation
- published packages, stable APIs, documentation, browser support, and release policy
- measured performance, accessibility, security, and memory behavior
- Custom Element interoperability with plain HTML and third-party frameworks

Vue compatibility syntax, Vue Single-File Component compilation, and automatic
Vue source migration are not Gluon 1.0 requirements. Any such requirement must
be added through a superseding RFC.

## Verified starting point

Gluon currently provides:

- cached `html` and `svg` templates with part-level DOM updates
- production child, attribute, property, boolean, event-option, lifecycle-directive,
  ref, spread, form-control, namespace, and explicit unsafe-content bindings
- nested templates, index-based array rendering, and keyed `repeat()` reconciliation
- standalone DOM-free refs, reactive and readonly proxies, effects, and computed values
- deterministic batching, phased scheduling, `nextTick`, effect scopes, and watchers
- scope-owned reactive render effects, batched declared properties, reconnect
  retention, and render diagnostics through `GluonElement`
- isolated application instances with plugins, providers, dynamic functional
  component registries, lifecycle, warnings, error boundaries, and exposure
- typed prop and event declarations, native and scoped slot contracts,
  controlled form/Custom Element models, and deterministic public refs
- an official router with typed static, dynamic, named, nested, redirected,
  aliased, and lazy routes; browser, hash, and memory histories; guards,
  failures, scroll restoration, and server snapshots
- an official DOM-free store with inferred state/getters/actions, transactions,
  plugins, compatible-state HMR, safe snapshots, persistence, and test isolation
- async boundaries/components, application-owned teleports, LRU cached views,
  cancellable transitions, keyed transition groups, and server descriptors
- public black-box test fixtures with automatic cleanup, ownership diagnostics,
  isolated Router/Store factories, and deterministic scheduler controls
- template/part source maps and official Vite integration with compatible
  component, Custom Element, Store, and constructable stylesheet HMR
- DOM-independent marked rendering, DSD output, safe embedded state, isolated
  requests, identity-preserving hydration, mismatch recovery, and nested
  abortable progressive streaming
- universal Vite asset manifests, route-aware SSG with mixed dynamic fallbacks,
  resource hints, initial style carriers, and adopted-sheet hydration handoff
- the first living GLUON GOODS reference-shop slice with public-package routes,
  responsive navigation, catalog, product configuration, search, and bag flows
- constructable stylesheet creation and adopted stylesheet management
- typed Quark factories for native HTML elements
- representative Atom, Molecule, and Organism packages
- ESM builds, TypeScript declarations, Chromium tests, and coverage thresholds

The current repository does not provide language tooling, Devtools, or a public
release.

## Product principles

1. **Outcome parity, not API cloning.** Gluon must cover production application
   outcomes without copying Vue's authoring model.
2. **Web-platform boundaries.** Custom Elements remain the public interoperability
   boundary unless an accepted RFC changes that contract.
3. **One styling contract.** Browser runtime styling continues to use adopted
   stylesheets; server style transport must be specified explicitly.
4. **Developer experience is part of the product.** A runtime feature is not
   complete until it can be authored, typechecked, debugged, tested, and documented.
5. **Evidence before claims.** Coverage, benchmarks, compatibility, accessibility,
   and security claims require reproducible verification.
6. **Core and UI remain separable.** Quarks, Atoms, Molecules, and Organisms must
   not make the framework core larger for applications that do not use them.

## Critical path

```text
Contracts and architecture
        │
        ├──▶ Renderer semantics ──┐
        └──▶ Reactivity/scheduler ├──▶ Component and application runtime
                                 │              │
                                 └──────────────┘
                                                │
                         ┌──────────────────────┼──────────────────────┐
                         ▼                      ▼                      ▼
                   Router/store          Developer tooling       Async UI
                         └──────────────────────┬──────────────────────┘
                                                ▼
                                  SSR, hydration, and SSG
                                                ▼
                               Quality gates and Gluon 1.0
```

No calendar estimates are attached to this roadmap because the repository does
not contain team-capacity or delivery-velocity data. GitHub dependencies and
milestone exit criteria define order.

## M0 — Contracts & Architecture

[View milestone](https://github.com/marcmalerei/gluon/milestone/1)

### Objective

Remove architectural ambiguity before public APIs or packages multiply. This
milestone establishes the Gluon 1.0 product contract, component boundary,
browser and stylesheet support, package graph, licensing, and release policy.

| Issue | Deliverable |
| --- | --- |
| [#14](https://github.com/marcmalerei/gluon/issues/14) | Define Gluon 1.0 scope and non-goals. |
| [#15](https://github.com/marcmalerei/gluon/issues/15) | Define the unified component and Custom Element model. |
| [#16](https://github.com/marcmalerei/gluon/issues/16) | Define browser, adopted stylesheet, and SSR style contracts. |
| [#17](https://github.com/marcmalerei/gluon/issues/17) | Establish package topology, licensing, and release governance. |

### Exit gate

- Accepted RFCs define the product, component, and interoperability contracts.
- The supported browser/runtime matrix and unsupported-environment behavior exist.
- Initial server style delivery is compatible with the browser styling contract.
- Package boundaries, license authority, SemVer, deprecation, and release rules exist.
- Every later roadmap issue can be evaluated against these contracts.

## M1 — Reactive Core

[View milestone](https://github.com/marcmalerei/gluon/milestone/2)

### Objective

Turn the current renderer and property-driven Custom Element base into a
deterministic, independently reactive component foundation.

| Issue | Deliverable |
| --- | --- |
| [#18](https://github.com/marcmalerei/gluon/issues/18) | Implement standalone reactivity primitives and dependency tracking. |
| [#19](https://github.com/marcmalerei/gluon/issues/19) | Implement scheduler, batching, `nextTick`, and effect scopes. |
| [#20](https://github.com/marcmalerei/gluon/issues/20) | Add keyed list reconciliation and a renderer conformance suite. |
| [#21](https://github.com/marcmalerei/gluon/issues/21) | Complete DOM, form, directive, event, namespace, and cleanup semantics. |
| [#22](https://github.com/marcmalerei/gluon/issues/22) | Integrate scoped reactive render effects with `GluonElement`. |

### Exit gate

- The reactivity package has no DOM dependency and has a stable typed API.
- Batched updates, effect ordering, cleanup, and `nextTick` are deterministic.
- Keyed moves preserve DOM and component identity.
- Forms, directives, namespaces, listeners, refs, and unsafe-content boundaries
  have documented production semantics.
- Disconnect and permanent unmount release every owned effect and binding.

## M2 — Application Platform

[View milestone](https://github.com/marcmalerei/gluon/milestone/3)

### Objective

Provide the complete application-level capabilities needed to ship a
production single-page application without Vue.

| Issue | Deliverable |
| --- | --- |
| [#23](https://github.com/marcmalerei/gluon/issues/23) | Add application instances, plugins, context, lifecycle, and error handling. |
| [#24](https://github.com/marcmalerei/gluon/issues/24) | Add typed props, events, slots, models, and refs. |
| [#25](https://github.com/marcmalerei/gluon/issues/25) | Build the official Gluon router. |
| [#26](https://github.com/marcmalerei/gluon/issues/26) | Build the official Gluon store. |
| [#27](https://github.com/marcmalerei/gluon/issues/27) | Add async components, Suspense, Teleport, KeepAlive, and transitions. |
| [#28](https://github.com/marcmalerei/gluon/issues/28) | Grow the production-like GLUON GOODS reference shop alongside every applicable framework capability. |

### Exit gate

- Multiple applications on one page have isolated plugins, context, router,
  store, scheduler, and error boundaries.
- Components expose typed input, output, content, model, ref, and lifecycle contracts.
- The router covers deep links, history, nested and lazy routes, guards, failures,
  and scroll restoration.
- The store covers typed state, getters, actions, subscriptions, plugins, HMR,
  Devtools hooks, and server isolation.
- The reference SPA uses only public Gluon APIs and passes its end-to-end flows.

## M3 — Developer Experience

[View milestone](https://github.com/marcmalerei/gluon/milestone/4)

### Objective

Make the framework productive and diagnosable from project creation through
editing, testing, debugging, and production building.

| Issue | Deliverable |
| --- | --- |
| [#29](https://github.com/marcmalerei/gluon/issues/29) | `create-gluon` and its 20-combination maintained starter matrix are implemented and verified. |
| [#30](https://github.com/marcmalerei/gluon/issues/30) | Build the Gluon Vite plugin and state-preserving HMR. |
| [#31](https://github.com/marcmalerei/gluon/issues/31) | Shared template analyzer, LSP server, CI checker, and VS Code client are implemented. |
| [#32](https://github.com/marcmalerei/gluon/issues/32) | Build Gluon Devtools. |
| [#33](https://github.com/marcmalerei/gluon/issues/33) | Build `@gluonjs/test-utils`. |
| [#34](https://github.com/marcmalerei/gluon/issues/34) | Build the Gluon playground and diagnostic reference. |

### Exit gate

- Every supported starter installs, typechecks, tests, and builds in CI.
- Compatible template, component, store, and stylesheet edits update through HMR
  without Custom Element registration failures or unnecessary state loss.
- Editor and CLI diagnostics validate tags, props, events, slots, ARIA, binding
  positions, and void-element children.
- Devtools expose component, reactive, router, store, scheduler, event, and
  performance information through a versioned protocol.
- Consumer tests use public utilities with deterministic scheduler and cleanup control.
- Diagnostics have stable codes, documentation, and shareable playground fixtures.

## M4 — Universal Rendering

[View milestone](https://github.com/marcmalerei/gluon/milestone/5)

### Objective

Run the same public component model as client-rendered, server-rendered,
hydrated, streamed, and statically generated applications.

| Issue | Deliverable |
| --- | --- |
| [#35](https://github.com/marcmalerei/gluon/issues/35) | Implement the SSR renderer and request isolation. |
| [#36](https://github.com/marcmalerei/gluon/issues/36) | Implement hydration, mismatch diagnostics, and streaming. |
| [#37](https://github.com/marcmalerei/gluon/issues/37) | Implement SSG, asset manifests, resource hints, and SSR style delivery. |

### Exit gate

- Public component definitions render on the client and server without private forks.
- Concurrent requests cannot observe another request's app, store, router, or effects.
- Matching server DOM retains node identity during hydration.
- Hydration mismatches have actionable diagnostics and deterministic recovery.
- Static output includes correct assets, resource hints, and initial styling.
- The universal reference flows pass in server, browser, and deployment fixtures.

## M5 — Gluon 1.0

[View milestone](https://github.com/marcmalerei/gluon/milestone/6)

### Objective

Convert completed framework capabilities into a supported, documented, measured,
licensed, and publicly consumable Gluon 1.0 release.

| Issue | Deliverable |
| --- | --- |
| [#38](https://github.com/marcmalerei/gluon/issues/38) | Establish cross-browser, performance, accessibility, security, memory, and CI gates. |
| [#39](https://github.com/marcmalerei/gluon/issues/39) | Stabilize the separately consumable Quark, Atom, Molecule, and Organism packages. |
| [#40](https://github.com/marcmalerei/gluon/issues/40) | Publish versioned guides, API docs, cookbook, examples, and migration material. |
| [#41](https://github.com/marcmalerei/gluon/issues/41) | Prepare and publish Gluon 1.0. |

The first #38 performance slice provides the production Gluon/Lit/Vue/Vanilla
DOM comparison harness, cross-browser runner, output-equivalence tests, and
retained raw baseline. Browser-matrix CI, accessibility, security, memory, and
regression-budget gates remain open acceptance work.

### Exit gate

- The accepted browser and runtime matrix is enforced in CI.
- Unit, component, integration, end-to-end, SSR, hydration, property, fuzz,
  accessibility, security, and memory evidence covers the applicable contracts.
- Vue, Lit, and Vanilla DOM benchmarks are reproducible and make no unsupported claims.
- Stable UI packages are accessible, tree-shakable, documented, and optional.
- Clean-room users can build and deploy the reference applications from public docs.
- Public packages include correct exports, types, license, provenance, signatures,
  changelog, SBOM, support policy, and deprecation policy.

## Gluon 1.0 release gates

Gluon 1.0 must not be published until all of the following are verified:

1. The production-like reference SPA passes its complete end-to-end acceptance suite.
2. The same public component model runs as CSR, SSR, streamed SSR, and SSG.
3. HMR preserves compatible component and store state.
4. Language tooling and CLI checks identify public template and component errors.
5. Devtools inspect applications, components, reactive dependencies, router,
   store, scheduler, events, errors, stylesheets, and render causes.
6. The supported browser and runtime matrix is green.
7. Performance, bundle, accessibility, security, memory, and hydration gates pass.
8. Plain HTML and third-party framework interoperability is verified.
9. Stable APIs and documentation match the exact release artifacts.
10. Installation from the public registry works from an empty directory.
11. License, SemVer, support, deprecation, changelog, provenance, signing, and
    SBOM requirements are satisfied.
12. Every critical roadmap issue is closed or removed through an accepted change
    to the Gluon 1.0 product-scope RFC.

## Cross-cutting verification

Verification is part of every milestone rather than a final cleanup phase:

- unit tests for isolated algorithms and reactivity
- real-browser component and renderer tests
- production-build end-to-end tests for reference applications
- Node-side SSR, request-isolation, streaming, and SSG tests
- hydration identity and mismatch fixtures
- property and fuzz testing for compilers, routing, and serialization boundaries
- memory-retention tests for components, effects, listeners, refs, and stores
- automated accessibility checks plus documented manual keyboard protocols
- security review for HTML, URLs, styles, SSR state, CSP, and Trusted Types
- bundle-size, startup, update, keyed-list, hydration, and memory benchmarks

High source coverage remains useful, but it is not sufficient evidence for an
application-, browser-, server-, accessibility-, security-, or performance-level
release claim.

## Planning and issue policy

- Roadmap epics use the `roadmap` and `type: epic` labels.
- Each epic records scope, acceptance criteria, and dependency links.
- Implementation work may be split into child issues without weakening the epic's
  acceptance criteria.
- A milestone closes only when its issues and exit gate have authoritative evidence.
- Dates should be added only when ownership, capacity, and dependency data support them.
- Changes to Gluon 1.0 scope require updating the accepted scope RFC, this document,
  and the GitHub tracker.

## Vue comparison references

The outcome baseline is derived from Vue's documented framework and ecosystem
surface, not from an assumption of source-level compatibility:

- [Vue introduction](https://vuejs.org/guide/introduction)
- [Vue component basics](https://vuejs.org/guide/essentials/component-basics)
- [Vue tooling](https://vuejs.org/guide/scaling-up/tooling)
- [Vue Router](https://router.vuejs.org/introduction.html)
- [Vue state management](https://vuejs.org/guide/scaling-up/state-management.html)
- [Vue testing](https://vuejs.org/guide/scaling-up/testing)
- [Vue server-side rendering](https://vuejs.org/guide/scaling-up/ssr)
