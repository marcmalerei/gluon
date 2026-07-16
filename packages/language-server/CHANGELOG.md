# Changelog

## [Unreleased]

### Added

- Added the versioned, deterministic `analyzeStaticGluonProject()` API,
  machine-readable schema, and zero-write `gluon-project-analyze` CLI.

## [1.0.10] - 2026-07-15

### Changed

- Reported lockstep framework version `1.0.10` while retaining the existing
  protocol and public diagnostics contract.

## [1.0.9] - 2026-07-15

### Changed

- Reported lockstep framework version `1.0.9` while retaining the existing
  protocol and public diagnostics contract.

## [1.0.8] - 2026-07-15

### Changed

- Reported lockstep framework version `1.0.8` while retaining the existing
  protocol and public diagnostics contract.

## [1.0.7] - 2026-07-14

### Changed

- Added declaration discovery for aliased `@customElement()` and `@property()`
  decorators while keeping `@state()` internal.
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

- Updated official dependency pins for the lockstep `1.0.1` recovery candidate
  after `v1.0.0` stopped before publication.

## [1.0.0] - 2026-07-13

- Add shared project diagnostics for Gluon HTML, SVG, and CSS templates.
- Add completion, hover, definition, rename, and semantic token services.
- Add the stdio LSP server and `gluon-template-check` CI command.
- Analyze native HTML and expose editor features inside aliased `compose()`
  template bodies at their original TypeScript locations.
- Add literal `defineGluonElement()` property, event, slot, tag, lifecycle, and
  cleanup-owner analysis to the shared editor/CLI contract.
- Diagnose unknown named light-DOM `slot` attributes against literal
  `defineGluonElement({ slots: ... })` declarations in editor and CLI output.
