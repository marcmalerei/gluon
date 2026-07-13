# Changelog

## [Unreleased]

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
