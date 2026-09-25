# Changelog

## [Unreleased]

## [1.13.0] - 2026-09-25

### Changed

- Prepared the 22-package lockstep release with the GraphQL connector, progressive learning documentation, production graph fix, and SSR load evidence.


## [1.12.3] - 2026-09-24

### Changed

- Released in the lockstep 1.12.3 patch train; public API additions from issues #521-#524 remain additive and backward compatible.


## [1.12.2] - 2026-09-23

### Changed

- Released in the lockstep 1.12.2 patch train; no package-specific public API change was introduced here.

## [1.12.0] - 2026-09-18

### Changed

- Released in the lockstep 1.12.0 train.

## [1.11.4] - 2026-09-18

### Fixed

- Released with lockstep hardening that tolerates normal npm registry propagation before release finalization.

## [1.11.3] - 2026-09-18

### Fixed

- Advanced the lockstep package train after re-resolving the VSIX Azure graph from the current registry and making its fresh-install smoke test a required pre-tag Quality Gates check.

## [1.11.2] - 2026-09-18

### Fixed

- Released with the lockstep patch that refreshes VSIX clean-install integrity after the immutable v1.11.1 candidate stopped before publication.

## [1.11.1] - 2026-09-18

### Fixed

- Released in the lockstep 1.11.1 patch train, which repairs the VSIX language-server version handshake.

## [1.11.0] - 2026-09-18

### Changed

- Advanced the lockstep release with the Tailwind-aware Vite integration and deduplicated Shadow DOM SSR stylesheet transport while retaining this package's public contract.

## [1.10.0] - 2026-08-16

### Changed

- Documented the six stable `GLUON_RESPONSIVE_DISCLOSURE_*` runtime diagnostics
  in the public versioned catalog with actionable remediation.
- Exposed the shared `parseGluonSfc()` boundary for editor tooling.

## [1.9.0] - 2026-08-15

### Changed

- Added stable diagnostic catalog entries for progressive SSR and tooling
  contract failures while retaining the compiler's public API boundary.

## [1.8.1] - 2026-08-12

### Changed

- Advanced the lockstep release for retained nested SSR hydration and request-local abort propagation while retaining this package's existing public contract.

## [1.8.0] - 2026-08-10

### Changed

- Advanced the lockstep release for the accessible Atom and Molecule component train while retaining this package's existing public contract.

## [1.7.0] - 2026-08-05

### Changed

- Advanced the lockstep release for the new optional `@gluonjs/i18n` package while retaining this package's existing public contract.

## [1.6.0] - 2026-07-28

### Changed

- Advanced the lockstep release for `@gluonjs/json-forms` while retaining this package's existing public contract.

## [1.5.0] - 2026-07-27

### Changed

- Advanced the lockstep release for the new `@gluonjs/graph` package while retaining the existing public package contract.

## [1.4.0] - 2026-07-24

### Changed

- Advanced the lockstep release with install-time agent guidance and the
  verified component-library correction while retaining the existing public
  package contract.

## [1.3.0] - 2026-07-23

### Added

- Added `compileGluonSfc()` for typed presentational `.gluon` components that
  lower to normal component, Quark, template, and constructable-style contracts.

## [1.2.0] - 2026-07-21

### Changed

- Advanced the lockstep release with the component-library and verified
  performance capability set while retaining the existing public contract.

## [1.1.0] - 2026-07-16

### Changed

- Advanced the lockstep release with the current verified capability set while
  retaining the existing public package contract.

## [1.0.10] - 2026-07-15

### Changed

- Retained the primitive-text compiler transform and its runtime helper
  contract while keeping compiler-owned helpers out of public declarations.

## [1.0.9] - 2026-07-15

### Changed

- Added a conservative production transform for direct declared-property text
  bindings in fixed `GluonElement` templates. Unsupported or mutable template
  shapes remain on the general runtime path.

## [1.0.8] - 2026-07-15

### Changed

- Advanced the lockstep release with the renderer and reactivity performance
  improvements while retaining the existing public package contract.

## [1.0.7] - 2026-07-14

### Changed

- Added Gluon decorator import detection, standard/legacy TypeScript decorator
  transpilation, and the `@customElement()` development HMR transform.
- Integrated the exact package name into dedicated generated README artwork.

## [1.0.6] - 2026-07-13

### Changed

- Advanced the lockstep package release with versioned release-tag ruleset
  bypass preflight evidence while retaining live public ruleset enforcement
  verification before npm publication.

## [1.0.5] - 2026-07-13

### Changed

- Advanced the lockstep package release with versioned immutable-release
  operator preflight evidence so protected publication no longer requires an
  unavailable Actions Administration permission.

## [1.0.4] - 2026-07-13

### Changed

- Advanced this package to the lockstep `1.0.4` recovery candidate after the
  immutable `v1.0.3` release stopped before publication.

## [1.0.3] - 2026-07-13

### Changed

- Advanced this package to the lockstep `1.0.3` recovery candidate after the
  immutable `v1.0.2` release stopped before publication.

## [1.0.2] - 2026-07-13

### Changed

- Advanced this package to the lockstep `1.0.2` recovery candidate after the
  immutable `v1.0.1` release stopped before publication.

## [1.0.1] - 2026-07-13

### Changed

- Included the unchanged Compiler runtime in the lockstep `1.0.1` recovery
  candidate after `v1.0.0` stopped before publication.

## [1.0.0] - 2026-07-13

- Added tagged-template locations, interpolation locations, diagnostics,
  high-resolution source maps, and development HMR transforms.
- Added the public versioned diagnostic catalog, compact production codes, and
  stable reference URLs under `@gluonjs/compiler/diagnostics`.
- Recognize aliased `compose()` tagged bodies as original-source HTML template
  boundaries without rewriting production output.
- Added `GLUON_UI_HYDRATION_MISMATCH` (`G1207`) for missing, duplicate,
  reordered, or content-mismatched scoped UI carrier evidence.
- Added `defineGluonElement()` HMR transforms plus source-located invalid-tag,
  missing-cleanup-owner, and deferred-lifecycle diagnostics.
- Added `GLUON_TEMPLATE_SLOT_UNKNOWN` (`G1111`) to the public catalog for
  source-located unknown named light-DOM slot assignments.
- Added `G1208` component-style hydration and `G1209` deprecated aggregate
  coexistence diagnostics.
