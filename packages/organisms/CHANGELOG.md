# Changelog

## [Unreleased]

## [1.0.0] - 2026-07-13

### Added

- Production GLUON GOODS `CheckoutExperience` composition through
  `defineOrganism()`, containing the single delivery form, repeated FormFields,
  PurchaseAction, and order summary without introducing another runtime.
- Exact renderer-owned AppShell style metadata.
- Initial separately consumable `@gluonjs/organisms` public package.
- A typed native AppShell extension contract that preserves organism-owned
  landmark composition.

### Deprecated

- `organismStyles`; aggregate/exact coexistence is rejected.
