# Changelog

## [Unreleased]

## [1.0.2] - 2026-07-13

### Changed

- Advanced this package to the lockstep `1.0.2` recovery candidate after the
  immutable `v1.0.1` release stopped before publication.

## [1.0.1] - 2026-07-13

### Fixed

- Source typechecking now resolves Reactivity through the Core source program
  without requiring prebuilt workspace declarations.

### Changed

- Updated official dependency pins for the lockstep `1.0.1` recovery candidate
  after `v1.0.0` stopped before publication.

## [1.0.0] - 2026-07-13

- Added the opt-in universal client asset manifest for SSR and static builds.
- Added development and production Gluon transforms with high-resolution
  template source maps and diagnostics.
- Added compatible Custom Element, functional component, Store, and
  constructable stylesheet HMR without full page reloads.
- Preserve `compose()` template locations and the existing compatible
  functional-component HMR identity through the compiler integration.
- Added functional Custom Element setup refresh that preserves registered host,
  explicit local/form state, ShadowRoot, and stylesheet identities.
- Preserve functional `styles` metadata through stable HMR proxies while
  replacing active component CSS in place without changing sheet identity.
- Retain generated UI-starter state, Button DOM, and application-sheet identity
  across compatible consumer and token edits.
