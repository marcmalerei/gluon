# Changelog

## 0.0.0

- Add interactive and non-interactive TypeScript project scaffolding.
- Add Router, Store, browser testing, UI atoms, SSR, and hydration selections.
- Validate paths, npm package names, non-empty targets, conflicting flags, and
  SSR compatibility before generation.
- Add the lockstep `gluon-template-check` command to every maintained starter.
- Generate Router links with the public `compose()` tagged-body path while
  preserving the same starter routes and rendered anchors.
- Generate UI starters that rely on renderer-owned exact Button styles without
  importing or adopting the deprecated aggregate Atom sheet.
- Add the interactive and flag-stable `add-component` workflow for app-local
  Atoms, Atom-composed Molecules, downward Organisms, `defineGluonElement`
  Custom Elements, and headless wrappers.
- Add validation-first dry runs, traversal/absolute/symlink/tag/name guards,
  collision refusal, separately confirmed overwrites, staged writes with
  rollback, deterministic dependency/barrel updates, and generated strict
  browser tests.
- Verify every component kind through packed clean installs, type and template
  checks, Chromium, client/SSR builds, and package dry runs.
