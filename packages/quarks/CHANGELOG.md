# Changelog

## [Unreleased]

## [1.0.1] - 2026-07-13

### Fixed

- Source typechecking now resolves Reactivity through the Core source program
  without requiring prebuilt workspace declarations.

## [1.0.0] - 2026-07-13

### Added

- Initial separately consumable `@gluonjs/quarks` public package.
- Element-derived `QuarkProps`, typed ARIA/data/event/property/boolean/ref
  bindings, per-component extension metadata, and the explicit
  `unsafeQuarkProps()` opt-out replace the generic string escape hatch.
