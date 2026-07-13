# Changelog

## [Unreleased]

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

### Changed

- Updated generated Gluon dependency pins to the lockstep `1.0.1` recovery
  candidate after `v1.0.0` stopped before publication.

## [1.0.0] - 2026-07-13

- Add interactive and non-interactive TypeScript project scaffolding.
- Add Router, Store, browser testing, UI atoms, SSR, and hydration selections.
- Validate paths, npm package names, non-empty targets, conflicting flags, and
  SSR compatibility before generation.
- Add the lockstep `gluon-template-check` command to every maintained starter.
- Generate Router links with the public `compose()` tagged-body path while
  preserving the same starter routes and rendered anchors.
- Generate UI starters that rely on renderer-owned exact Button styles without
  importing or adopting the deprecated aggregate Atom sheet.
- Generate complete UI applications with one shared UI/theme owner, a separate
  app-token owner, a typed reactive and accessible Button consumer, computed
  style assertions, compatible token/consumer HMR evidence, and SSR hydration
  that retains DOM without duplicate sheet adoption or recovery.
- Add the interactive and flag-stable `add-component` workflow for app-local
  Atoms, Atom-composed Molecules, downward Organisms, `defineGluonElement`
  Custom Elements, and headless wrappers.
- Add validation-first dry runs, traversal/absolute/symlink/tag/name guards,
  collision refusal, separately confirmed overwrites, staged writes with
  rollback, deterministic dependency/barrel updates, and generated strict
  browser tests.
- Verify every component kind through packed clean installs, type and template
  checks, Chromium, client/SSR builds, and package dry runs.
- Own every invalid-input rejection at assertion creation time so reserved
  Custom Element names retain their exact diagnostic without an asynchronous
  unhandled-Promise escape under coverage.
