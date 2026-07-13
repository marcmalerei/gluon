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

- Production GLUON GOODS usage of Button presets across navigation, dialogs,
  product configuration, and bag quantity flows, plus Input search, shared
  brand tokens, lifecycle cleanup, and production marker/tree-shaking evidence.
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
- The maintained `create-gluon --ui` starter now demonstrates one shared owner,
  app-owned token mapping, exact Button sheet retention, native attributes,
  reactive state, computed styles, and deterministic cleanup.
