# Changelog

## [Unreleased]

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
