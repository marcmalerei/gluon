# Release operations

Gluon uses one lockstep release for the 16 packages in
[`package-contract.json`](../package-contract.json). The executable release
contract is [`release/release-contract.json`](../release/release-contract.json),
and `.github/workflows/release.yml` is the only supported publication path.

## Current publication state

Publication remains blocked while the repository is private and npm scope
control is unverified. In that state every package stays `private: true`, uses
the documentation version `0.0.0`, and keeps release work under `Unreleased`.
This is enforced by:

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
4. npm recovery owners and multi-factor authentication satisfy the accepted
   governance policy.
5. Every package has a trusted-publisher binding to this repository and the
   `Release` workflow. No long-lived npm publication token is configured.
6. A protected GitHub environment named `npm` has named reviewers, prevents
   self-review and administrator bypass, and permits only `v*` tags.
7. An active GitHub tag ruleset covers `refs/tags/v*` and restricts tag
   creation, update, and deletion.
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
repeats the full repository check and artifact build. The protected `npm`
environment must then approve the publication job.

The publication job verifies public repository visibility, required environment
reviewers and tag policy, release-tag mutation rules, immutable GitHub releases,
and the absence of long-lived npm token variables. All release-workflow actions
are pinned to commit SHAs. It attests archives, SBOMs, checksums, the immutable
compatibility manifest, and other evidence, then creates or updates a draft
GitHub release.

The workflow publishes every reviewed archive through npm trusted publishing
with provenance under `gluon-staging-v<version-with-dashes>`, never directly to
`latest`. Before the first publish it proves that all 16 npm package records
already exist. After each publish it compares registry integrity and provenance
with `release-evidence.json`. A rerun skips an already-existing version only
when those facts match; a mismatch stops the train.

After all 16 staging publications succeed, an authorized npm owner reviews the
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
