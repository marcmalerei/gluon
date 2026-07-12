# Changelog

## [Unreleased]

### Added

- Exact tree-shakable Button, Icon, Input, and Label sheets plus immutable
  style IDs on public component and manifest metadata.
- Initial separately consumable `@gluonjs/atoms` public package.
- `installUi()`, `UiOwner`, and `createUiStyleSelection()` for one-call shared
  UI ownership, target-local theme switching, SSR carrier validation, and
  idempotent cleanup.

### Deprecated

- `atomStyles`; rendered components own exact sheets, and aggregate/exact
  coexistence reports `GLUON_LEGACY_COMPONENT_STYLE_CONFLICT`.
- `installUiTheme()`; use `installUi()` and retain its returned owner.

### Changed

- Typed native `attributes` contracts, app-owned `defineButtonPreset()` brand
  extensions, `defineIcon()` custom geometry, protected accessibility
  semantics, and documented Button CSS custom properties.
