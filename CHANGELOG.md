# Changelog

All notable changes to official Gluon packages are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and released versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A versioned seven-task Gluon/Vue/React developer-experience benchmark
  contract, strict raw-run evidence schema, official comparator-selection
  record, and blocking validator that reports the current zero-run boundary
  without making an unsupported comparison claim.
- Reviewed task-oriented examples for all 507 generated public API symbol
  pages, with symbol-specific purpose text and concrete application, lifecycle,
  input/output, ownership, error, and cleanup flows shared through maintained
  package recipes instead of compiler-only type or import demonstrations.
- A blocking generated-reference gate that rejects missing catalog coverage,
  generic dependency-consumer copy, compiler placeholders, private imports, and
  snippets that fail strict TypeScript compilation or rendered-page validation.
- A machine-validated Vue codemod no-go decision covering 14 candidate classes,
  17 retained files, 52 analyzer inventory records, 26 findings, explicit
  counterexamples, and a zero-write expected-output contract.
- The Node-only `@gluonjs/vue-migration-analyzer` package and
  `gluon-vue-analyze` CLI with deterministic human/JSON reports, a versioned
  public schema, bounded static Vue 3.5 SFC/project inventory, explicit
  unsupported findings, no-execution/no-write security controls, and retained
  positive, negative, malformed, and adversarial fixtures.

- Identity-preserving SSR hydration with actionable mismatch diagnostics,
  request snapshot restoration, Declarative Shadow DOM upgrade coordination,
  and abortable nested progressive streaming in `@gluonjs/ssr`.
- Route-aware static generation, Vite asset manifests, resource hints,
  request-nonce style carriers, and transactional adopted-sheet hydration.
- A complete GLUON GOODS bag-to-checkout journey with typed delivery state,
  order placement, and URL-addressable confirmation.
- Separately consumable `@gluonjs/quarks`, `@gluonjs/atoms`,
  `@gluonjs/molecules`, and `@gluonjs/organisms` packages with stable contract
  manifests, headless focus/dialog/popover/listbox/form primitives, reusable
  light/dark theme sheets, compiled examples, and browser accessibility evidence.

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
- The DOM-free `@gluonjs/store` package with inferred state, computed getters,
  actions, inspectable transactions, plugins, safe server snapshots,
  compatible-state HMR, persistence adapters, and isolated testing managers.
- Core async boundaries and components with loading, nested fallback, timeout,
  retry, abort, router preload, and explicit server-renderer descriptors.
- Application-owned Teleport hosts, LRU KeepAlive view caching, cancellable
  element/component transitions, and keyed FLIP transition groups with
  reduced-motion behavior.
- The official `@gluonjs/test-utils` package with public black-box component,
  Custom Element, context, plugin, Router, Store, scheduler, leak-detection, and
  automatic-cleanup fixtures.
- The shared `@gluonjs/compiler` template-location/source-map transform and the
  official `@gluonjs/vite` plugin with compatible functional component, Custom
  Element, Store, and constructable stylesheet HMR.
- The DOM-independent `@gluonjs/ssr` renderer with safe template/state
  serialization, async built-ins, Declarative Shadow DOM elements, isolated
  application/Router/Store/effect-scope requests, and ordered stream adapters.
- The living mobile-first GLUON GOODS reference shop with responsive
  navigation, catalog and product routes, configurable products, search, a
  reactive bag, generated product imagery, adopted stylesheet-only design, and
  a repository rule requiring applicable Gluon features to grow the same app.
- GLUON GOODS now owns one official Store instance per application and persists
  configured bag lines without sharing transient UI state between applications.
- GLUON GOODS now checks typed product availability asynchronously, caches route
  views, teleports and transitions its accessible bag, and animates keyed bag
  line changes through public Core APIs.
- MIT licensing authorized by Marc Malerei.
- Package topology, release governance, and supply-chain requirements.
- A machine-readable package contract with independent export validation.
- A production-built Gluon, Lit, Vue, and optimized Vanilla DOM rendering
  comparison with identical-output tests, calibrated interleaved samples,
  Chromium/Firefox/WebKit evidence, exact environment metadata, raw results,
  and an interactive browser demonstration.
- A machine-readable release contract, lockstep candidate validator,
  reproducible package-content digests, SPDX 2.3 and CycloneDX 1.7 SBOMs,
  pinned-schema validation, immutable compatibility manifests, SHA-256
  manifests, SHA-pinned workflow actions, OIDC artifact attestation,
  recoverable staged-tag npm trusted publication, interactive-2FA `latest`
  promotion, and clean-room registry verification.

### Changed

- Empty Core node parts insert a single new node directly while preserving
  fragment batching for multi-node commits, with DOM regression coverage and
  retained before/after rendering evidence.
- Cloned Core templates instantiate all element/comment bindings in one DOM
  traversal while preserving expression-index and hydration-marker order.
- Renamed the private root package from the occupied unscoped name `gluon` to
  the planned scoped name `@gluonjs/core`.
- Renderer hot paths now specialize stable string bindings, precompute binding
  commit priorities, and update unchanged keyed order without rebuilding lookup
  maps; external DOM recovery and keyed identity contracts remain covered by
  browser tests.

### Fixed

- Renderer ownership now refreshes top-level nodes after reactive application
  and nested-template updates, so conditional dialogs are removed without
  stale nodes being reinserted by a later render.
