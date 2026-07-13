# Changelog

## [Unreleased]

## [1.0.1] - 2026-07-13

### Fixed

- Source typechecking now resolves Reactivity without requiring its prebuilt
  workspace declarations.

### Changed

- Updated the Reactivity dependency pin for the lockstep `1.0.1` recovery
  candidate after `v1.0.0` stopped before publication.

## [1.0.0] - 2026-07-13

### Added

- A complete `defineStore()` example covering typed state, manager ownership,
  state patching, and cleanup.
- Typed application-scoped stores with state, computed getters, actions,
  transactions, plugins, HMR state reconciliation, persistence, and isolated
  testing managers.
- Versioned DOM-free state snapshots with safe HTML embedding and deterministic
  hydration.
