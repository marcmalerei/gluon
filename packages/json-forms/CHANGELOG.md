# Changelog

All notable changes to this package are documented in the root [Gluon changelog](../../CHANGELOG.md).

## [Unreleased]

### Added

- Added nested object fields and bounded array item editors with immutable data events, native form participation, validation, reset, state restore, and explicit fail-closed diagnostics for unsupported schema features.
- Added the public `resolveJsonSchema()`, `JsonSchemaResolutionOptions`, and
  `JsonSchemaResolutionError` contract for bounded synchronous local `$ref`
  resolution below root `$defs` and legacy `definitions`, with RFC 6901 token
  decoding, deeply immutable output, safe sibling precedence, and stable
  diagnostics for unsafe or invalid references.

## [1.9.0] - 2026-08-15

### Added

- Added nested object fields and bounded array item editors with immutable data
  events, native form participation, validation, reset, state restore, and
  explicit fail-closed diagnostics for unsupported schema features.

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

### Added

- Initial schema-driven, form-associated `gluon-json-form` Custom Element.
