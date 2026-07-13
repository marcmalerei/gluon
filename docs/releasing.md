# Release operations

Gluon uses one lockstep release for the 17 packages in
[`package-contract.json`](../package-contract.json). The executable release
contract is [`release/release-contract.json`](../release/release-contract.json),
and `.github/workflows/release.yml` is the only supported publication path.

## Current publication state

Publication remains blocked while the machine-readable package contract records
`publicationState: blocked` and `scopeControl: unverified`. In that state every
package stays `private: true`, uses the documentation version `0.0.0`, and keeps
release work under `Unreleased`. External setup work does not make the source
tree releasable until every owner-controlled prerequisite has been verified and
the reviewed release-cut PR changes those fields together. This is enforced by:

```sh
npm run check:release-contract
```

The validator also checks lockstep manifest and lockfile versions, exact
official-package dependency versions, public/provenance publish settings,
license and archive allowlists, the documentation version, and the protected
release workflow. A blocked repository must not present itself as a releasable
candidate.

`create-gluon` is part of the same lockstep group even though it has no runtime
dependency. Its generated UI manifest pins `@gluonjs/core`, `@gluonjs/atoms`,
`@gluonjs/reactivity`, and any selected Router, Store, SSR, test-utils, Vite, and
language-server packages to that exact release version. Candidate validation
therefore includes the 20 generated application selections so a published
`create-gluon --ui` command cannot point at a different framework version.

Issue #107's weekly DX scorecard is release-adjacent evidence, not publication
authorization. Its automated run may be retained while `humanPasses` is empty,
but it cannot satisfy the completed DX contract or replace any owner-controlled
release, browser/device, assistive-technology, registry, or approval evidence.

## Repository commit identity

Repository-owned maintainer commits use the canonical Git identity
`marcmalerei <post@marcmalerei.com>`. Before creating commits, verify the
effective repository configuration rather than assuming that the global
configuration applies:

```sh
git config user.name
git config user.email
git var GIT_AUTHOR_IDENT
```

The expected name is `marcmalerei`, and the expected email address is
`post@marcmalerei.com`. GitHub-generated merge commits use the GitHub account
identity instead of the local Git configuration. The account must therefore
have the same address verified and selected before a merge. Verify the result
immediately after merging:

```sh
git fetch origin main
git show --no-patch --format='author=%an <%ae>%ncommitter=%cn <%ce>' origin/main
```

Do not merge a branch whose commits contain an unintended author, committer, or
co-author identity. Correct unpublished branch commits before review. A repair
of published history requires a dedicated issue, a complete recovery bundle,
an inventory of every maintained remote reference, exact tree comparisons
before and after rewriting, and verification from a fresh clone. Do not combine
that operation with source changes.

## Owner-controlled prerequisites

Before preparing the `1.0.0` release commit, the repository owner must verify
all of the following outside the source tree:

1. The GitHub repository is public.
2. The `@gluonjs` npm organization and the unscoped `create-gluon` name are
   controlled by the project. Registry 404 responses do not prove control.
3. Each selected package name has an existing, owner-controlled npm package
   record. npm trusted publishing cannot create a brand-new package. Any
   bootstrap publication is an owner-controlled, interactive-2FA operation and
   is not performed by this workflow.
4. npm account recovery and multi-factor authentication satisfy the accepted
   single-owner governance policy. `marcmalerei` is the sole required npm
   organization owner; a second owner is explicitly not required. The owner
   must use `auth-and-writes` 2FA, keep the npm account linked to GitHub, and
   retain current npm recovery codes outside the device used as the second
   factor. This contract records the required controls, not evidence that the
   recovery codes are currently stored. The project accepts that loss of the
   sole owner account can suspend organization and package administration and
   require npm Support account recovery.
5. Every package has a trusted-publisher binding to this repository and the
   `Release` workflow. No long-lived npm publication token is configured.
6. A GitHub environment named `npm` uses the accepted single-operator model:
   it has no required reviewers, independent human approval, self-review rule,
   or wait timer; disallows administrator bypass and long-lived npm secrets;
   and permits only the `v*` tag pattern. The project accepts that the operator
   who creates a release tag can publish immutable package versions under the
   staging dist-tag without another person's approval.
7. Two active GitHub tag rulesets cover exactly `refs/tags/v*`. The creation
   rule gives only the `marcmalerei` user an `always` bypass so the sole
   operator can cut a release. The update and deletion rules have no bypass
   actor, making an existing release tag immutable for every user, including
   repository administrators.
8. GitHub immutable releases are enabled.
9. The release-cut branded browser/device and assistive-technology protocols in
   [`browser-device-evidence.md`](browser-device-evidence.md) and
   [`accessibility.md`](accessibility.md) have dated evidence.

Record the final manual matrix in `release/evidence/<version>.json` using
[`release/manual-evidence.schema.json`](../release/manual-evidence.schema.json).
Strict candidate validation requires the seven branded browser/device rows, the
seven named assistive-technology combinations with exact versions, a successful
Quality Gates run, HTTPS evidence URLs, testers, dates, and at least one named
approver. Do not commit placeholder or inferred results.

Also freeze `release/compatibility/<version>.json` against
[`release/compatibility-manifest.schema.json`](../release/compatibility-manifest.schema.json).
It records the exact supported Chrome, Edge, Firefox, Safari, Android, and Node
versions, engines, operating systems/devices, modes, evidence identifiers, and
CSR/SSR/streaming/hydration/SSG results required by ADR 0001. Both evidence
files must name the same tested commit and successful Quality Gates run. After
that commit, strict validation permits only those two evidence files to change.

Do not change `package-contract.json` from `blocked`/`unverified` to
`ready`/`verified` until those facts have been checked by an owner.

## Owner-controlled package-record bootstrap

npm package settings expose trusted-publisher configuration only after the
package record exists. The one-time bootstrap therefore publishes a minimal
`0.0.0-bootstrap.1` placeholder for every package under the
`gluon-bootstrap` dist-tag. These placeholders contain only `package.json`,
`README.md`, and `LICENSE`: they expose no runtime, executable, types, exports,
dependencies, or supported API. They do not use provenance, because this is an
interactive owner publication rather than the protected release workflow.

The first live bootstrap attempt created
`@gluonjs/reactivity@0.0.0-bootstrap.0` with the reviewed archive integrity, but
npm also materialized `latest` for that new package record and returned HTTP
400 when the owner tried to remove it. The public packument was unavailable for
several minutes after the successful publish response even though npm already
reported the package as public and owner-controlled. Because published versions
are immutable, the corrected bootstrap is `0.0.0-bootstrap.1`; the release
contract retains the exact integrity and SHA-1 of the superseded Reactivity
record. Until the first supported release replaces the temporary state,
`latest` may be absent or point only to the reviewed current bootstrap or that
exact contracted predecessor. Any other value blocks the bootstrap.

Prepare and inspect the deterministic allowlisted archives from clean `main`:

```sh
npm ci --ignore-scripts
npm run check:release-bootstrap
npm run release:bootstrap:artifacts
cat .tmp/npm-bootstrap/bootstrap-evidence.json
cat .tmp/npm-bootstrap/SHA256SUMS
for archive in .tmp/npm-bootstrap/packages/*.tgz; do
  tar -tzf "$archive"
done
npm run release:bootstrap:publish -- --dry-run
```

The builder records the exact source commit, archive integrity, SHA-1, SHA-256,
and file allowlist for all 17 packages. Review every name and archive before the
irreversible step. The publisher rejects `NPM_TOKEN` and `NODE_AUTH_TOKEN`, an
artifact set that is not byte-identical to an independent rebuild, a dirty or
non-`main` checkout, a source commit that is not the exact current
`origin/main`, a user who is not an npm organization owner, a conflicting
existing package record, any unexpected `latest`, and a rerun whose registry
integrity differs from the reviewed archive. Registry visibility is allowed up
to ten minutes after a successful publish before the operation stops; this wait
does not weaken the exact integrity and dist-tag checks.

The npm owner then runs this command in an interactive terminal and completes
the registry's 2FA challenges without copying credentials or one-time codes
into logs, issues, or chat:

```sh
npm run release:bootstrap:publish -- --confirm-owner-controlled-bootstrap
```

A matching partial run is recoverable: already-published immutable bootstrap
versions are verified and skipped, while missing records continue. After all
records exist, confirm that every package maps `gluon-bootstrap` to
`0.0.0-bootstrap.1`. Any `latest` tag must resolve only to that reviewed
bootstrap version or, for Reactivity, its exact contracted
`0.0.0-bootstrap.0` predecessor. The first supported release replaces this
temporary `latest` state for the complete package train.

For each package, configure npm Trusted Publishing from its package settings
with GitHub Actions, repository owner `marcmalerei`, repository `gluon`,
workflow filename `release.yml`, environment `npm`, and the `npm publish`
allowed action required by this repository's workflow. npm does not validate
these coordinates when they are saved, so review them exactly. Configure and
verify all 17 bindings before restricting traditional token publishing; no
long-lived publication token may be added to GitHub.

## Release-candidate commit

The reviewed release PR must make these changes together:

- set every official manifest to version `1.0.0` and `private: false`;
- set every official implementation and peer dependency to exact `1.0.0`;
- update `package-lock.json` from the resulting manifests;
- change the package contract registry state to `ready` with verified scope
  control;
- add dated `1.0.0` sections to the root and all package changelogs;
- copy and review the versioned documentation as `1.0.0`, then make that version
  latest and supported;
- attach the completed manual release-cut evidence.
- attach the completed immutable compatibility manifest.

Validate that commit before creating a tag:

```sh
npm ci --ignore-scripts
npm run check
npm run release:validate -- --candidate 1.0.0
npm run release:artifacts -- --version 1.0.0
```

`release:artifacts` packs every package twice and compares canonical unpacked
file SHA-256 digests. It produces the package archives, aggregate and
per-package SPDX 2.3 and CycloneDX 1.7 SBOMs, `release-evidence.json`, and a
`SHA256SUMS` manifest under `.tmp/release`.

SPDX output is validated against the vendored official SPDX 2.3 JSON schema.
The release contract pins its upstream commit, source URL, and SHA-256; a schema
change therefore requires an explicit reviewed contract update.

For repository-development verification, the same artifact builder can run on
the current blocked version without making the result publishable:

```sh
npm run build
npm run release:artifacts -- --allow-blocked
```

The resulting evidence explicitly records `blockedDevelopmentBuild: true`, and
the publisher rejects it.

## Protected publication

After the candidate PR is merged and all gates are green, create the exact
reviewed `v1.0.0` tag. The tag starts the `Release` workflow. Its candidate job
repeats the full repository check and artifact build. The single-operator `npm`
environment then admits the publication job without independent approval. It
permits only `v*` tags and disallows administrator bypass and long-lived npm
secrets.

The publication job verifies public repository visibility, the absence of
environment reviewers and an uncontracted wait timer, the exact `v*` tag policy,
disabled administrator bypass, release-tag mutation rules, immutable GitHub
releases, and the absence of long-lived npm token variables. All
release-workflow actions are pinned to commit SHAs. It attests archives, SBOMs,
checksums, the immutable compatibility manifest, and other evidence, then
creates or updates a draft GitHub release.

The workflow publishes every reviewed archive through npm trusted publishing
with provenance under `gluon-staging-v<version-with-dashes>`, never directly to
`latest`. Before the first publish it proves that all 17 npm package records
already exist. After each publish it compares registry integrity and provenance
with `release-evidence.json`. A rerun skips an already-existing version only
when those facts match; a mismatch stops the train.

After all 17 staging publications succeed, an authorized npm owner reviews the
draft evidence and promotes every exact package version to `latest` with
interactive 2FA using `npm dist-tag add <name>@<version> latest`. OIDC trusted
publishing does not authorize dist-tag changes. The owner may remove the
temporary staging tags after finalization with `npm dist-tag rm`.

Finally, dispatch the `Release` workflow from the exact `v<version>` tag with
`phase=finalize` and the matching version. The protected finalizer downloads
the draft assets, requires every `latest` tag to point to the reviewed version,
compares registry integrity and provenance, performs a clean-directory install
and public-type check, attaches the registry verification and final checksum
manifest, and only then publishes the immutable GitHub release. A partial
manual promotion makes finalization fail without publishing the GitHub release.

A second fresh runner independently builds the same source commit and compares
every canonical unpacked package-file digest with the candidate job. The
publication job cannot start unless this reproducibility job passes.

A failed publication is never retried by rebuilding `1.0.0`. Preserve the run
and draft-release evidence and rerun the failed jobs with the same artifacts.
Matching immutable registry versions are verified and skipped; unpublished
packages continue. If any existing registry version has different integrity or
lacks provenance, stop and follow the new-version policy in ADR 0002.
