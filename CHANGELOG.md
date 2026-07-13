# Changelog

All notable changes to official Gluon packages are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and released versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.3] - 2026-07-13

### Fixed

- Protected npm publication and finalization no longer ask `actions/setup-node`
  to create token-backed registry authentication, so its placeholder
  `NODE_AUTH_TOKEN` cannot conflict with the repository's no-token policy.
- The publisher and final registry verifier now pass the contracted npm
  registry explicitly, and release-contract validation rejects a protected job
  that restores `setup-node` registry authentication.

### Changed

- Advanced the first supported release candidate to `1.0.3` after the immutable
  `v1.0.2` tag passed all release gates but stopped before GitHub draft creation
  or npm publication on the generated placeholder token.

## [1.0.2] - 2026-07-13

### Fixed

- The release reproducibility job now runs the complete root build before
  rebuilding package artifacts, so `@gluonjs/vue-migration-analyzer` and future
  release-group additions cannot be omitted by a manually maintained build
  list.
- Release-contract validation now rejects a reproducibility job that does not
  use the complete root build.

### Changed

- Advanced the first supported release candidate to `1.0.2` after the immutable
  `v1.0.1` tag passed candidate, browser, Node, and performance gates but failed
  reproducibility before GitHub draft creation or npm publication.

## [1.0.1] - 2026-07-13

### Fixed

- Package source typechecks now retain the Reactivity aliases required by their
  direct or Core-transitive imports, so a clean release checkout no longer
  depends on prebuilt workspace declarations.
- The primary Quality Gates repository job now starts the full check directly
  after installation. The check typechecks clean source first, then builds the
  public package exports required by its coverage and integration suites.

### Changed

- Advanced the first supported release candidate to `1.0.1` after the immutable
  `v1.0.0` tag failed before artifact creation or registry publication.

## [1.0.0] - 2026-07-13

### Added

- The reviewed `1.0.0` release-candidate contract: 17 public lockstep manifests,
  versioned documentation and diagnostics, schema-validated package metadata,
  and a two-commit, full-history Quality Gates evidence flow whose intermediate
  artifacts are explicitly non-publishable.
- Machine-validated single-operator release-tag governance that lets only the
  named operator create `v*` tags while no-bypass rules make existing release
  tags immutable against update and deletion.
- A machine-validated, owner-controlled npm bootstrap contract that produces
  minimal non-runtime archives for all 17 package records, restricts any
  registry-created temporary `latest` tag to a reviewed bootstrap placeholder,
  records the exact superseded first package attempt, waits for registry
  convergence, rejects long-lived publication tokens, and makes the later
  trusted publisher verify the exact bootstrap version.
- GLUON GOODS production dogfooding for official Button, Icon, Input, Label,
  and FormField components plus app-local brand presets, a repeated delivery
  Molecule, a real checkout Organism, target-owned CSR/SSR/hydration/static
  styles, cross-engine accessibility/teardown evidence, and selected-component
  production tree-shaking checks.
- Immutable exact component-style metadata, render-target reference counting,
  deterministic adoption order, async/built-in/Custom Element/application
  lifecycle ownership, request-derived SSR and progressive transport, exact
  hydration diagnostics, and production tree-shaking evidence.
- GLUON GOODS search integration and retained raw/gzip/module/sheet plus final
  bounded T2/T3 DX evidence for usage-driven UI styles.
- A deterministic `create-gluon add-component` workflow with five verified
  app-local ownership templates, complete dry-run plans, validation-first
  filesystem safety, separately confirmed overwrites, managed public exports,
  and packed clean-project evidence across browser, HMR, SSR/hydration,
  language-tooling, test-utils, and Devtools-compatible boundaries.
- Complete `create-gluon --ui` applications with a one-step shared theme owner,
  app-owned tokens, an accessible typed reactive Button consumer, exact
  usage-driven sheets, computed-style tests, state-preserving consumer/token
  HMR, and SSR hydration without duplicate adoption or recovery.
- The public `compose(component, props)\`body\`` functional-component authoring
  path, compiler/language-tooling boundaries, retained Gluon/React/Vue
  checkout-dialog comparison, generated starter and Playground examples, and
  GLUON GOODS RouterLink adoption without another renderer or host.
- `defineGluonElement()`, `elementProperty()`, and `elementEvent()` for concise
  stateful autonomous Custom Elements with inferred public contracts, explicitly
  keyed reconnect/HMR state, connection-owned setup cleanup, form association,
  SSR/hydration, Devtools, test-utils, compiler, and language-tooling evidence.
- A retained Gluon class/functional, Vue, and React stateful form-control
  comparison with separate component/boundary metrics, browser and SSR evidence,
  generator and Playground examples, explicit limitations, and every verified
  Gluon disadvantage recorded without a general ranking claim.
- Source-located editor and `gluon-template-check` diagnostics for unknown named
  light-DOM slot assignments against literal functional-element declarations.
- A versioned seven-task Gluon/Vue/React developer-experience benchmark
  contract, strict raw-run evidence schema, official comparator-selection
  record, and blocking validator that reports the current zero-run boundary
  without making an unsupported comparison claim.
- Target-scoped, reference-counted Core stylesheet owners and immutable named
  stylesheet selections with stable transport digests.
- One-step `@gluonjs/atoms` `installUi()` ownership for shared layers,
  foundation, tokens, identity-preserving light/dark switching, nested
  ShadowRoots, scoped SSR carriers, deterministic hydration diagnostics, and
  idempotent cleanup.
- GLUON GOODS integration of the shared UI owner in client, SSR, and hydration
  flows while retaining its separate product stylesheet.
- A consistent typed native extensibility contract across all 15 stable UI
  entries, including Button presets, custom Icon definitions, explicit unsafe
  opt-out, public style-hook ownership, strict fixtures, cross-engine evidence,
  identical Gluon/Vue/React DX tasks, and a GLUON GOODS checkout integration.
- Rootless `svg` template fragments now compile in the SVG namespace and use a
  template-type-specific cache, enabling app-owned Icon geometry consistently
  in Chromium, Firefox, and WebKit.
- Reviewed task-oriented examples for all 575 generated public API symbol
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

- Gluon 1.0 release evidence now stops at the exact automated Playwright
  Chromium, Firefox, and WebKit engine lanes and Node LTS lanes; manual branded
  browser/device and assistive-technology matrices are no longer release gates,
  and no corresponding product or platform support is claimed.
- GitHub release governance now explicitly uses a no-reviewer single-operator
  `npm` environment, with the immutable staging-publication risk accepted and
  machine-validated `v*`-only deployments, disabled administrator bypass, and
  no long-lived npm secrets.
- npm release governance now explicitly accepts `marcmalerei` as the single
  organization owner without requiring a second owner, while retaining
  `auth-and-writes` 2FA, linked-GitHub, separately stored recovery-code, and
  accepted npm Support recovery-risk requirements as machine-validated gates.
- SSR style manifests now accept named Core selections and preserve their stable
  IDs and optional hydration scopes in emitted carriers.
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

### Deprecated

- `installUiTheme()` is superseded by `installUi()`, whose typed owner supports
  runtime theme changes and exact target-scoped cleanup.
