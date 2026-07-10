# Changelog

All notable changes to official Gluon packages are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and released versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A standalone, DOM-free `@gluonjs/reactivity` package with refs, deep and
  shallow object and collection proxies, effects, computed values, dependency
  debugging hooks, Node tests, and declaration contract tests.
- A deterministic phased scheduler with batching, `nextTick`, untracked reads,
  hierarchical effect scopes, scheduled watchers, cleanup, and a contained
  reactivity error channel.
- MIT licensing authorized by Marc Malerei.
- Package topology, release governance, and supply-chain requirements.
- A machine-readable package contract with independent export validation.

### Changed

- Renamed the private root package from the occupied unscoped name `gluon` to
  the planned scoped name `@gluonjs/core`.
