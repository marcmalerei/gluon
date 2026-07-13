# Changelog

## [Unreleased]

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
