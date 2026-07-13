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

## [1.0.0] - 2026-07-13

### Added

- Production GLUON GOODS checkout usage of five repeated, required FormField
  compositions and the app-local PurchaseAction Molecule.
- Exact tree-shakable Card and FormField sheets with stable manifest IDs.
- Initial separately consumable `@gluonjs/molecules` public package.
- Typed native Card, Input, and FormField-label extension contracts with owned
  composition protected from attribute replacement.

### Deprecated

- `moleculeStyles`; aggregate/exact coexistence is rejected.
