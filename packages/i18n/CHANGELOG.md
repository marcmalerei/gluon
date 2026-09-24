# Changelog

## [Unreleased]

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

### Added

- Added regional and ordered locale fallback chains, ICU-style plural/select
  interpolation, `Intl` number/date helpers, namespace loading status, and
  JSON-safe `snapshot()`/`hydrate()` state transfer for SSR.

## [1.9.0] - 2026-08-15

### Added

- Added regional and ordered locale fallback chains, ICU-style plural/select
  interpolation, `Intl` number/date helpers, namespace loading status, and
  JSON-safe `snapshot()`/`hydrate()` state transfer for SSR.

## [1.8.1] - 2026-08-12

### Changed

- Advanced the lockstep release for retained nested SSR hydration and request-local abort propagation while retaining this package's existing public contract.

## [1.8.0] - 2026-08-10

### Changed

- Advanced the lockstep release for the accessible Atom and Molecule component train while retaining this package's existing public contract.

## [1.7.0] - 2026-08-05

### Added

- Added the first optional `@gluonjs/i18n` package with application injection,
  reactive locale state, deterministic fallbacks, interpolation, and lazy
  locale-scoped namespace loading.
