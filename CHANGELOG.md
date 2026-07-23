# Changelog

All notable changes to official Gluon packages are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and released versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.3.0] - 2026-07-23

### Added

- Added `defineUiAtom()` for concise, typed presentational Atom authoring with
  conditional native tags, owned constructable stylesheets, and explicit slot
  migration behavior.
- Added typed presentational `.gluon` Single-File Components through the shared
  compiler and Vite plugin, with normal Gluon component, Quark, template, and
  constructable stylesheet output.
- Added the first-party `@gluonjs/gluon-components-vite` Storybook Vite
  framework and native Gluon renderer with typed CSF exports and exact teardown.
- Added a junior learning path, compiled end-to-end examples, and a component
  decision guide that distinguishes official primitives from honest app-local
  GLUON GOODS components.

### Changed

- Migrated the component-library Storybook acceptance surface from the generic
  Web Components adapter to native Gluon templates and lifecycle ownership.
- Integrated the new Atom and `.gluon` authoring APIs into the canonical GLUON
  GOODS shop while preserving official package boundaries.
- Updated the audited `fast-uri` development dependency to a non-vulnerable
  release.

## [1.2.0] - 2026-07-21

### Added

- Added public Quarks component-library manifest validation and an explicit
  dependency-aware loader with observable state, caching, scoped Custom Element
  registration, constructable stylesheet ownership, SSR style snapshots, and
  deterministic release/disposal.
- Added a separately packed component-library and production consumer example,
  plus a Storybook catalog whose real controls, loader states, interactions,
  WCAG A/AA checks, and visual baselines are retained by CI.
- Added reproducible Gluon/Lit/Vue/React bundle fixtures and an expanded runtime
  scorecard for SSR, hydration, routing, component loading, styles, teardown,
  interaction latency, memory, and supported long-task observations.
- Added a production component property/state CPU profiler with retained raw
  Chrome DevTools profiles and exact environment metadata.

### Changed

- Compiler-proven primitive component property updates now share one ordered
  microtask queue while lifecycle, hydration, cleanup, disturbed DOM, and all
  unproven shapes retain the full scheduler and renderer path.
- Browser coverage files now run serially so the shop's real two-second async
  inventory timeout is measured without concurrent cold-transform contention;
  the same files and global thresholds remain enforced.
- Updated the release SBOM generator to `@cyclonedx/cdxgen` 12.8.0, removing
  the vulnerable `tar` dependency reported by the release security audit.

## [1.1.0] - 2026-07-16

### Added

- Added the optional Eleventy prerendering adapter and a canonical GLUON GOODS
  build proving route parity, assets, SSR styles/state, and browser hydration.
- Added a complete static Gluon project inventory API and CLI with explicit
  evidence confidence, retained GLUON GOODS output, and clean-install gates.
- Added `LayoutTransition()` for render-to-render direct-root geometry,
  shared layout identity, cancellation, reduced-motion, and stable SSR output.
- Added universal scoped Custom Element registry handles, explicit class and
  functional registration targets, ShadowRoot ownership, duplicate-name
  isolation, DSD/SSR hydration transport, registry-partitioned HMR, and a
  global fallback used by the GLUON GOODS product action boundary.
- Added deterministic production preview commands for every runnable example,
  an all-examples launcher, HTTP smoke verification, and a Node-only static
  shop build gate covering routes, fallbacks, assets, and hydration state.
- Added optional `@gluonjs/reactivity/signals` and
  `@gluonjs/reactivity/preact-signals` adapters with explicit lifecycle,
  coalesced scheduling, realm validation, SSR-safe disconnected reads, a real
  GLUON GOODS availability integration, and a runnable dual-implementation
  example.
- Added the public `createVirtualizer()` controller for accessible vertical
  lists and grids with stable keys, overscan, dynamic measurement, scroll
  anchoring, keyboard traversal, deterministic SSR/hydration, and owned cleanup.
- Added first-class SSR and hydration fixtures to `@gluonjs/test-utils/ssr` and
  moved the canonical GLUON GOODS request-to-interaction regression onto that
  public transport and cleanup boundary.
- Added realm-correct reactive wrappers for intersection, resize, and mutation
  observers with callback-ref ownership, retargeting, stale-callback rejection,
  unsupported-environment fallback, and deterministic stop behavior. GLUON
  GOODS uses the intersection wrapper to prioritize approaching product media.

## [1.0.10] - 2026-07-15

### Fixed

- Kept compiler-owned primitive-text helpers available to generated runtime
  modules while excluding their internal re-export from the public Core
  declaration bundle, so packed Core declarations typecheck cleanly.

### Added

- Release artifact construction now clean-installs all 17 local package
  archives and typechecks every contracted public export before publication.

## [1.0.9] - 2026-07-15

### Fixed

- Kept the shared decorator metadata key typed as `symbol`, allowing the
  lockfile-pinned TypeScript 5.9 standard-library `Symbol.metadata` declaration
  and the runtime fallback to typecheck through the same exported contract.

### Added

- Added a production-built component comparison for Gluon, Lit, and Vue across
  Custom Element lifecycle, public property, internal state, and keyed-list
  workloads, with identical Shadow DOM output checks, calibrated interleaved
  samples, three-browser evidence, exact environment metadata, and CI retention.

### Changed

- The production compiler now marks only statically proven primitive
  property-to-text templates. Matching `GluonElement` instances update that
  Part through a guarded scheduler path while retaining property conversion,
  validation, reflection, update ordering, `updateComplete`, DOM recovery, and
  the general render fallback for lifecycle, hydration, reactive, structural,
  or mutable-binding work.
- Component property and state comparisons now use dedicated scenario classes
  in all three frameworks, and the Gluon benchmark runs through the official
  production Vite compiler rather than a source alias alone.
- Synchronous Reactivity scheduler jobs now complete without an artificial
  microtask boundary between every job while real asynchronous jobs remain
  awaited in deterministic order.
- `GluonElement` now reuses its captured application/error-boundary reporter
  for one connection, omits development-only render-cause objects from
  production updates, and rebuilds the reporter after reconnecting under a new
  owner.
- Event bindings now retain one native, application-guarded dispatcher while
  callbacks change, avoiding listener replacement and per-render guard-wrapper
  creation without changing event options, error routing, or async handling.
- Comparative benchmark builds now compile aliased Gluon source with
  `__GLUON_DEV__` disabled, use conflict-free ephemeral preview ports, and
  isolate property/state/list component surfaces from unrelated work.
- The measured GLUON GOODS initial graph is now 191,197 raw bytes and 55,385
  level-9 gzip bytes; its reviewed ceilings are 191,500 / 55,500 bytes.

## [1.0.8] - 2026-07-15

### Changed

- Cached each compiled template as an active-document `DocumentFragment` so
  new root and nested instances use a deep clone instead of repeating the
  inert template-content import for every instance.
- Reduced renderer hot-path allocations by sharing immutable empty style
  metadata, reconciling unkeyed children by position without a temporary Set,
  and clearing spread keys through the existing live Set.
- Skipped development-mode detection on reactive dependency tracking and
  triggering paths when an effect has no corresponding debugger hook.
- Optimized stable unstyled text roots and primitive keyed rows with seeded
  text slots, direct single-root cloning, lazy structural anchors, compact
  attribute/text updates, and a bounded pristine keyed-prototype cache while
  retaining the general style, directive, hydration, and cleanup paths.

## [1.0.7] - 2026-07-14

### Changed

- Changed future lockstep releases to publish all 17 packages directly under
  `latest` through npm Trusted Publishing. The protected workflow now performs
  publication, complete registry and clean-install verification, and GitHub
  release finalization in one recoverable job, without long-lived npm tokens,
  dist-tag mutation, or 17 interactive 2FA approvals.
- Added opt-in standard and legacy TypeScript authoring decorators through
  `@gluonjs/core/decorators`: `@customElement()`, `@property()`, and `@state()`.
  The official Vite plugin transpiles them, preserves compatible Custom Element
  HMR, and the Language Server discovers decorated public contracts.
- Documented every decorator beside its plain TypeScript equivalent and moved
  the GLUON GOODS product configurator to the public decorator entry point.
  Its measured production entry is 186,096 bytes (53,998 gzip), within the
  updated 188,000-byte and 55,000-byte versioned shop budgets.
- Expanded the component authoring and generated API documentation with
  junior-oriented property, event, lifecycle, and public-class guidance.
- Replaced the shared package README hero with 17 generated header images that
  integrate each exact package name directly into the artwork.
- Added an explicit released contract state so post-release repository checks
  produce non-publishable development artifacts without weakening strict
  immutable candidate validation.

## [1.0.6] - 2026-07-13

### Fixed

- Release-tag ruleset bypass actors are now captured in the versioned operator
  preflight evidence; GitHub omits those administration-only fields from
  responses authorized by the ephemeral Actions `GITHUB_TOKEN`.
- Protected publication still verifies the exact ruleset IDs, active tag
  enforcement, `refs/tags/v*` conditions, and creation/update/deletion rule
  types live before any npm mutation.

### Changed

- Advanced the first supported release candidate to `1.0.6` after immutable
  `v1.0.5` passed candidate and reproducibility gates but stopped before draft
  creation, attestation, or npm publication while checking hidden ruleset
  bypass actors.

## [1.0.5] - 2026-07-13

### Fixed

- Immutable GitHub release enablement is now captured in the versioned
  operator preflight evidence instead of being queried by the workflow token;
  GitHub requires repository Administration read access for that endpoint, a
  permission unavailable to an ephemeral Actions `GITHUB_TOKEN`.
- Protected publication continues to verify the public repository,
  environment, deployment policy, tag rulesets, operator identity, and exact
  Quality Gates run live with the scoped workflow token.

### Changed

- Advanced the first supported release candidate to `1.0.5` after immutable
  `v1.0.4` passed all release and reproducibility gates but stopped before
  draft creation, attestation, or npm publication on the administration-only
  immutable-releases query.

## [1.0.4] - 2026-07-13

### Fixed

- Protected publication and finalization now expose GitHub's ephemeral workflow
  token to the hosting-verification step, allowing its read-only repository,
  environment, immutable-release, and ruleset checks to run in GitHub Actions.
- Release-contract validation now rejects either protected job when the hosting
  verifier lacks that scoped ephemeral token.

### Changed

- Advanced the first supported release candidate to `1.0.4` after the immutable
  `v1.0.3` tag passed every release and reproducibility gate but stopped before
  GitHub draft creation or npm publication because hosting verification could
  not authenticate its GitHub API reads.

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
