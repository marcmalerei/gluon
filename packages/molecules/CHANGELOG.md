# Changelog

## [Unreleased]

### Added

- Added controlled `DropdownMenu`, `ContextMenu`, and `Menubar` compositions
  over one bounded item model plus a native-action `Toolbar`, including roving
  focus, typeahead, checked and disabled states, submenus, RTL behavior, and
  collision-safe ARIA relationships.
- Added the controlled, router-independent `NavigationMenu` composition for
  native hierarchical site and product navigation, including instance-scoped
  IDs, keyboard/RTL traversal, dismissal, focus return, SSR/hydration cleanup,
  and separate styles (#446).
- Added `ResponsiveDisclosure`, a native responsive disclosure with compact
  breakpoint state, desktop expansion, resettable compact memory, and teardown-safe media-query synchronization.
- Added request-free `SearchField` and `SearchResults` compositions with native
  form/search/input/list semantics, controlled query state, grouped results,
  explicit loading/empty/partial-failure/disabled states, and component-owned
  responsive custom properties (#372).

- Added request-free `Toast`, client-activated `ToastViewport`, and validated
  `createToastController()` primitives with keyed live regions, bounded queue
  promotion, exact pause deadlines, and stale-notification-safe SSR hydration.
- Added `createFormController()` as a DOM-independent, request-free form
  orchestration contract for typed field registration, values, touched/dirty
  state, field errors, asynchronous validation, submission lifecycle,
  cancellation, reset, subscriptions, and SSR snapshot/hydration.

## [1.9.0] - 2026-08-15

### Added

- Added `createFormController()` as a DOM-independent, request-free form
  orchestration contract for field state, asynchronous validation,
  cancellation, submission lifecycle, reset, subscriptions, and SSR
  snapshot/hydration.

## [1.8.1] - 2026-08-12

### Changed

- Advanced the lockstep release for retained nested SSR hydration and request-local abort propagation while retaining this package's existing public contract.

## [1.8.0] - 2026-08-10

### Added

- Added the stable `TableRegion` molecule for named, caller-owned native tables
  with optional summary and empty content, plus an overflow hint and viewport
  Tab stop only when horizontal scrolling is present. It intentionally does
  not own DataGrid, sorting, selection, pagination, or virtualization behavior.

- Added static `EmptyState` composition with optional media, semantic heading,
  body, caller-owned recovery action, compact/full layout, and real GLUON GOODS
  empty-bag integration.

- Added `InlineNotice` bounded feedback with neutral, info, success, warning,
  and danger tones, explicit live-region modes, caller-owned actions, and real
  GLUON GOODS order-confirmation feedback.

- Added controlled `Accordion` composition over native Disclosure items with
  single or multiple open values, stable headings, optional focus traversal,
  and URL-backed GLUON GOODS shipping topics.

- Added native `Disclosure` details/summary composition with controlled or
  initial open state, toggle handling, visible unavailable reasons, logical
  marker styling, and GLUON GOODS shipping-detail integration.

- Added `DialogSurface` over the headless ARIA Dialog, Overlay, and focus-scope
  contracts, with structured title, description, content, close-action, and
  footer regions plus controlled dismissal and a real GLUON GOODS bag drawer.

- Added controlled accessible `Tabs` with stable tab/panel relationships,
  automatic or manual activation, roving keyboard focus, disabled skipping,
  horizontal/vertical RTL overflow layouts, and URL-backed GLUON GOODS product
  information panels.

- Added the controlled `SegmentedControl` Molecule with named toolbar and
  pressed-button semantics, roving Arrow/Home/End navigation, disabled-option
  skipping, horizontal/vertical RTL layout, and a URL-backed GLUON GOODS
  Grid/List catalog view.

- Added the accessible layout-only `ButtonGroup` Molecule with named group
  semantics, horizontal/vertical and spaced/attached presentation, wrapping,
  logical-property styling, and GLUON GOODS header-action integration.

- Added the native-fieldset `ChoiceGroup` Molecule with visible legend, helper,
  error, disabled propagation, horizontal/vertical layout, and caller-owned
  Checkbox/Radio options in GLUON GOODS product configuration.
- Added the generic `ControlField` Molecule with caller-rendered controls,
  deterministic label/helper/error relationships, required indication, exact
  styles, and GLUON GOODS delivery-instructions integration.

## [1.7.0] - 2026-08-05

### Changed

- Advanced the lockstep release for the new optional `@gluonjs/i18n` package while retaining this package's existing public contract.

### Added

- Added the accessible `NavigationStrip` composition with overflow controls,
  resize/content observation, and automatic reveal of the `aria-current`
  destination without dropping focus from an operated edge control.

## [1.6.0] - 2026-07-28

### Changed

- Advanced the lockstep release for `@gluonjs/json-forms` while retaining this package's existing public contract.

## [1.5.0] - 2026-07-27

### Changed

- Advanced the lockstep release for the new `@gluonjs/graph` package while retaining the existing public package contract.

## [1.4.0] - 2026-07-24

### Changed

- Advanced the lockstep release with install-time agent guidance and the
  verified component-library correction while retaining the existing public
  package contract.

## [1.3.0] - 2026-07-23

### Changed

- Advanced the lockstep release with the concise authoring and native Storybook
  capability set while retaining the existing public contract.

## [1.2.0] - 2026-07-21

### Changed

- Advanced the lockstep release with the component-library and verified
  performance capability set while retaining the existing public contract.

## [1.1.0] - 2026-07-16

### Changed

- Advanced the lockstep release with the current verified capability set while
  retaining the existing public package contract.

## [1.0.10] - 2026-07-15

### Changed

- Advanced the lockstep release with declaration-safe package artifacts while
  retaining the existing public package contract.

## [1.0.9] - 2026-07-15

### Changed

- Advanced the lockstep release with the component and reactivity performance
  improvements while retaining the existing public package contract.

## [1.0.8] - 2026-07-15

### Changed

- Advanced the lockstep release with the renderer and reactivity performance
  improvements while retaining the existing public package contract.

## [1.0.7] - 2026-07-14

### Changed

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
