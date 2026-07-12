# Changelog

## [Unreleased]

### Added

- Black-box functional component, Custom Element, and template fixtures with
  props, slots, events, application context, plugins, and deterministic cleanup.
- Isolated Router and Store factories, fixture leak reporting, automatic cleanup,
  and public scheduler settling controls.
- Functional Custom Element fixtures retain inferred properties/exposed methods
  and verify setup cleanup through ordinary mount ownership.
- The maintained UI starter now uses a Playwright-backed application test for
  accessible reactive behavior, computed styling, exact-sheet cleanup, and the
  public SSR hydration boundary.
