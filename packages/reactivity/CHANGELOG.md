# Changelog

## [Unreleased]

### Changed

- Added the shared Gluon package header with the exact package name.

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

### Changed

- Included the unchanged Reactivity runtime in the lockstep `1.0.1` recovery
  candidate after `v1.0.0` stopped before publication.

## [1.0.0] - 2026-07-13

### Added

- Standalone refs, object and collection proxies, effects, computed values, and
  development dependency-debugging hooks.
- A deduplicating pre/update/post scheduler, synchronous batching, `nextTick`,
  untracked reads, hierarchical effect scopes, watchers, cleanup, and error
  routing.
- Lazy effects, update-phase effect scheduling, and an eager invalidation hook
  for render-owner integration.
- Scope stopping continues through remaining owned effects and cleanup when an
  effect stop hook fails.
