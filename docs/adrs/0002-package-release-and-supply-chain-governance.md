# ADR 0002: Package, release, and supply-chain governance

- **Status:** Accepted
- **Decision date:** 2026-07-10
- **Tracking issue:** [#17](https://github.com/marcmalerei/gluon/issues/17)
- **Roadmap tracker:** [#42](https://github.com/marcmalerei/gluon/issues/42)
- **Depends on:** [RFC 0001](../rfcs/0001-gluon-1.0-product-scope.md), [RFC 0002](../rfcs/0002-unified-component-model.md), [ADR 0001](0001-browser-runtime-and-style-transport.md)
- **Supersedes:** Nothing

## Decision summary

Official framework packages use the `@gluonjs` npm scope. The project generator
uses the unscoped name `create-gluon`. The current private root package is named
`@gluonjs/core`; its existing UI subpath exports are transitional and will move
to separately consumable packages before 1.0.

Every official package follows one lockstep Semantic Versioning release train,
one changelog, one source tag, and one immutable GitHub release. Public releases
use npm trusted publishing from GitHub Actions, npm provenance, GitHub artifact
attestations, per-package and aggregate SBOMs, checksums, and a clean-build
reproducibility check. Long-lived npm publication tokens are prohibited.

The repository and packages use the MIT License with the authorized notice
`Copyright © 2026 Marc Malerei`.

No package may be published until control of the `@gluonjs` npm scope is
verified. Provenance-bearing public publication additionally requires this
repository to be public. The current repository is private, so publication
remains blocked.

## Verified registry and repository state

The following observations were made against the public npm registry and the
repository on 2026-07-10:

- `npm view gluon` resolved the existing third-party package `gluon@1.8.4`.
  Gluon therefore rejects the unscoped `gluon` package name.
- Exact registry requests returned HTTP 404 for `create-gluon` and each selected
  `@gluonjs/*` package listed below.
- An HTTP 404 does not establish ownership, reservation, or future availability.
- `npm whoami` failed because the local npm client is not authenticated. Control
  of the `@gluonjs` organization could not be verified.
- The GitHub repository is private, has no releases, and has no Git tags.
- The root package was private, version `0.0.0`, and named `gluon` before this
  decision. `npm pack --dry-run --json` succeeded, but its output contained no
  license or changelog.

The selected namespace is a release contract, not an assertion of registry
ownership. Issue [#41](https://github.com/marcmalerei/gluon/issues/41) must
verify organization control and trusted-publisher configuration before the
first publication. If `@gluonjs` cannot be controlled, a superseding ADR must
choose a different namespace and update every package, import, template, and
documentation reference before publication.

## Package topology

[`package-contract.json`](../../package-contract.json) is the machine-readable
source of truth. `npm run check:packages` validates its names, exports,
dependencies, and acyclic graph. It also validates actual build targets and
`npm pack` contents for every package whose state is `current`. A named contract
can be checked independently with:

```bash
npm run check:packages -- --package @gluonjs/core
npm run check:packages -- --package @gluonjs/reactivity
```

Planned packages pass contract validation before their directories exist. When
implementation starts, changing a package state to `current` makes its package
manifest, export targets, license, changelog, README, and pack output mandatory.

| Package | Responsibility | Allowed official dependencies |
| --- | --- | --- |
| `@gluonjs/reactivity` | Signals, computed state, effects, scopes, and scheduler-independent reactive primitives | none |
| `@gluonjs/compiler` | Static template analysis and shared diagnostics | none |
| `@gluonjs/core` | Templates, renderer, component/application runtime, Custom Elements, and style APIs | `reactivity` |
| `@gluonjs/router` | History, route matching, navigation, guards, and route components | `core`, `reactivity` |
| `@gluonjs/store` | Request-local and client shared state | `reactivity` |
| `@gluonjs/ssr` | Server rendering, streaming, hydration payloads, and request isolation | `core`, `reactivity` |
| `@gluonjs/vite` | Build integration, transforms, manifests, and HMR | `compiler` |
| `@gluonjs/test-utils` | Public mounting, queries, scheduler control, and cleanup | `core`, `reactivity` |
| `@gluonjs/devtools-api` | Versioned, environment-neutral inspection protocol | none |
| `@gluonjs/devtools` | Browser Devtools client and integrations | `devtools-api` |
| `@gluonjs/language-server` | Editor analysis and protocol server | `compiler` |
| `@gluonjs/quarks` | Typed native-element factories | `core` |
| `@gluonjs/atoms` | Focused UI primitives | `core`, `quarks` |
| `@gluonjs/molecules` | Reusable primitive compositions | `core`, `quarks`, `atoms` |
| `@gluonjs/organisms` | Larger interface structures | `core`, `quarks`, `atoms`, `molecules` |
| `create-gluon` | Project generator and maintained templates | none at runtime |

Package dependency names in the table omit the common `@gluonjs/` prefix.
Third-party build dependencies are not part of this architectural graph.

### Dependency rules

1. The graph is acyclic. Core never depends on the router, store, SSR, tooling,
   Devtools, test utilities, or UI packages.
2. Reactivity and compiler packages do not depend on DOM APIs. Store state is
   server-safe and request-local when used during SSR.
3. UI dependencies point only downward: Organisms to Molecules to Atoms to
   Quarks to Core. Applications can omit every UI package.
4. Tooling consumes versioned public exports. Cross-package source deep imports,
   `dist` deep imports, and undeclared package entry points are prohibited.
5. Browser packages used by universal rendering must not evaluate browser-only
   globals at Node import time. ADR 0001 controls style extraction and the
   server-to-browser handoff.
6. Runtime integrations that require one application or reactivity identity use
   compatible peer dependencies plus matching development dependencies. Pure
   implementation dependencies in the release group use the exact lockstep
   version.
7. `@gluonjs/devtools-api` owns only a serializable protocol. Framework-specific
   adapters belong in their consuming packages, preventing a protocol-to-core
   dependency cycle.

### UI package boundary

Core exposes only `.` and `./styles`. Quarks, Atoms, Molecules, and Organisms
are current named packages with one root export each. Their implementation and
manifest metadata live under `packages/`; Core contains only the generic
component-definition helpers required by those optional consumers.

## Public API boundary

The following are public compatibility commitments once a package reaches a
stable release:

- package export names, JavaScript behavior, TypeScript declarations, and
  documented configuration
- Custom Element tag names, properties, attributes, methods, events, slots, and
  lifecycle timing
- CSS custom properties, parts, states, layers, and other documented style hooks
- serialized SSR/hydration formats, style manifests, Devtools protocols, and
  compiler or language-server protocols that are marked public
- CLI commands, flags, exit codes, stable diagnostic codes, and maintained
  template behavior

Undocumented source paths, internal symbols, generated file layout, private
diagnostics, test fixtures, and benchmark internals are not public API. The
`exports` map is the enforcement boundary; adding an export requires documented
ownership and compatibility tests.

## Versioning and support

All official packages use the same version and are released together, including
packages without source changes. One lockstep train prevents unsupported
combinations while the component, SSR, compiler, Devtools, and UI protocols
stabilize.

Gluon follows Semantic Versioning:

- `0.y.z` releases are explicitly unstable. Minor releases may contain breaking
  changes, and every such change must be called out in the changelog.
- Starting with `1.0.0`, incompatible public API changes require a major release,
  backward-compatible additions require a minor release, and compatible fixes
  require a patch release.
- A released version is immutable and is never rebuilt or republished. A defect
  is fixed in a new version.
- `latest` points only to stable releases, `next` to release candidates or other
  planned prereleases, and `canary` to explicitly unsupported commit previews.
- The latest major and its latest minor receive regular fixes. The latest minor
  of the immediately preceding major receives critical security fixes. Older
  lines are unsupported unless a release notice explicitly extends support.
- Supported Node and browser versions follow ADR 0001 and the immutable
  compatibility manifest attached to each release.

## Deprecation and removal

A stable public API is deprecated before removal:

1. Introduce the deprecation in a minor release with an alternative, migration
   instructions, a changelog entry, TypeScript `@deprecated` metadata where
   applicable, and a stable development diagnostic where runtime use is visible.
2. Retain it through at least the next stable minor release.
3. Remove it only in a major release and list the removal under `Removed`.

Security, legal, or data-integrity emergencies may require immediate disabling
or removal. The security advisory and release notes must record the reason and
the smallest safe migration path.

Published npm versions are deprecated rather than unpublished. Unpublishing is
reserved for legal requirements, exposed secrets, or security emergencies and
must comply with npm policy. A defective release is fixed with a new version;
moving a dist-tag may limit discovery but does not rewrite history.

## Changelog and release process

`CHANGELOG.md` is maintained in the repository with `Added`, `Changed`,
`Deprecated`, `Removed`, `Fixed`, and `Security` categories. Every release PR:

1. verifies a clean source tree, lockfile, package graph, public exports, types,
   full test matrix, documentation, licenses, dependency audit, and package
   contents
2. updates all official package versions and exact intra-repository dependencies
3. freezes the release compatibility manifest and changelog
4. builds every package from a clean checkout and compares the unpacked,
   canonical package-file SHA-256 digests with the candidate artifacts
5. creates one protected `vX.Y.Z` tag for the reviewed source commit
6. creates one immutable GitHub release containing packages, checksums,
   compatibility evidence, SBOMs, and attestations
7. obtains required approval through a protected GitHub release environment
8. publishes through npm trusted publishing with public access and provenance
9. verifies registry installation, exports, types, provenance, and dist-tags
   from an empty consumer project

The first public release additionally verifies the npm organization, package
names, public repository state, trusted-publisher bindings, recovery owners,
and account multi-factor authentication.

## Supply-chain evidence

Public release jobs use GitHub-hosted runners, minimal job permissions, and
`id-token: write` only where OIDC or attestations require it. npm trusted
publishing is the only authorized publication identity; repository or
organization secrets must not contain a long-lived npm publication token.

Each package and the aggregate release receive:

- npm provenance linked to the public source repository and GitHub Actions run
- GitHub artifact attestations backed by Sigstore's transparency log
- an SPDX 2.3 JSON SBOM and a CycloneDX 1.7 JSON SBOM
- a `SHA256SUMS` manifest covering release assets
- source commit, workflow identity, Node/npm versions, and lockfile digest in
  the release evidence

Provenance authenticates build origin; it does not prove that source or
dependencies are safe. Tests, review, dependency policy, audits, and incident
response remain separate release gates.

npm documents that automatic provenance from trusted publishing is
available only for public repositories publishing public packages. Because this
repository is private, issue #41 must make it public before a compliant release.
Static GPG release keys are not required: the OIDC, npm provenance, and Sigstore-
backed GitHub attestations provide the selected short-lived signing model.

## Authorization and licensing

Marc Malerei explicitly authorized the following repository license and notice
on 2026-07-10:

> MIT License, Copyright © 2026 Marc Malerei.

The root [`LICENSE`](../../LICENSE) contains the MIT terms and exact notice.
Every package manifest declares `MIT`, and every package archive includes the
license. Third-party code and dependencies retain their own notices and license
obligations; they must not be relabeled as Gluon-owned code.

## Consequences

- The private package now has its final planned Core name, while publication is
  blocked until registry authority and public provenance prerequisites exist.
- The current single-package build remains usable while package extraction is
  staged through roadmap issues.
- Lockstep releases publish unchanged packages too, trading extra registry
  versions for one compatibility matrix.
- UI packages remain optional and cannot grow Core through reverse dependencies.
- Release automation has more gates and artifacts, but every public package can
  be traced to reviewed source and independently inspected.

## Primary references

- [npm scoped packages](https://docs.npmjs.com/cli/v11/using-npm/scope/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
- [npm dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages/)
- [npm package deprecation](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)
- [npm unpublish policy](https://docs.npmjs.com/policies/unpublish/)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Open Source Initiative MIT License](https://opensource.org/license/mit)
- [GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- [GitHub supply-chain security and immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/supply-chain-security)
- [SPDX 2.3 specification](https://spdx.github.io/spdx-spec/v2.3/)
- [CycloneDX 1.7 JSON specification](https://cyclonedx.org/docs/1.7/json/)

## Acceptance checklist

- [x] The namespace decision records observed registry results without claiming ownership.
- [x] Package responsibilities, dependency direction, public exports, and graph validation are defined.
- [x] The authorized MIT license and exact copyright notice are present.
- [x] SemVer, support, deprecation, changelog, and release rules are documented.
- [x] Provenance, attestation, signing, SBOM, checksum, and reproducibility gates are documented.
- [x] Every planned package contract can be validated independently.
- [x] Current package exports, types, license, changelog, and pack contents are validated after build.
- [x] Publication remains blocked until npm scope control and public-repository provenance requirements are verified.
