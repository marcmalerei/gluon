# Changelog

All notable changes to official Gluon packages are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and released versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A standalone, DOM-free `@gluonjs/reactivity` package with refs, deep and
  shallow object and collection proxies, effects, computed values, dependency
  debugging hooks, Node tests, and declaration contract tests.
- A deterministic phased scheduler with batching, `nextTick`, untracked reads,
  hierarchical effect scopes, scheduled watchers, cleanup, and a contained
  reactivity error channel.
- Keyed `repeat()` reconciliation with stable DOM and Custom Element identity,
  deterministic invalid-key diagnostics, renderer conformance coverage, and a
  1,000-row Chromium benchmark harness.
- Production DOM semantics for controlled and uncontrolled forms, lifecycle
  directives, native event options, qualified namespaces, explicit unsafe HTML
  and URL escapes, reversible render suspension, permanent unmount, external
  DOM recovery, and pre-upgrade property precedence.
- Scope-owned reactive `GluonElement` rendering through the shared update
  scheduler, including reconnect retention and render-cause/timing diagnostics.
- Isolated application instances with plugins, typed providers, dynamic
  functional components, lifecycle hooks, warnings, error boundaries,
  event/async ownership, deterministic unmount, and controlled exposure.
- Persistent application mount ownership for `Element` and `ShadowRoot`, with
  deterministic rejection of drainable plain `DocumentFragment` roots.
- Typed property and event declarations, native and scoped slot contracts,
  standard and Custom Element model bindings, and deterministic host, callback,
  element, and exposed-instance refs.
- The official `@gluonjs/router` package with browser, hash, and memory
  histories; typed route matching and queries; nested, aliased, redirected, and
  lazy routes; guards, navigation failures, scroll restoration, Gluon app
  bindings, and server location snapshots.
- The living mobile-first GLUON GOODS reference shop with responsive
  navigation, catalog and product routes, configurable products, search, a
  reactive bag, generated product imagery, adopted stylesheet-only design, and
  a repository rule requiring applicable Gluon features to grow the same app.
- MIT licensing authorized by Marc Malerei.
- Package topology, release governance, and supply-chain requirements.
- A machine-readable package contract with independent export validation.

### Changed

- Renamed the private root package from the occupied unscoped name `gluon` to
  the planned scoped name `@gluonjs/core`.

### Fixed

- Renderer ownership now refreshes top-level nodes after reactive application
  and nested-template updates, so conditional dialogs are removed without
  stale nodes being reinserted by a later render.
