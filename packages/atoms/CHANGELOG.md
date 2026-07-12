# Changelog

## [Unreleased]

### Added

- Initial separately consumable `@gluonjs/atoms` public package.
- `installUi()`, `UiOwner`, and `createUiStyleSelection()` for one-call shared
  UI ownership, target-local theme switching, SSR carrier validation, and
  idempotent cleanup.

### Deprecated

- `installUiTheme()`; use `installUi()` and retain its returned owner.
