# Release operations

Gluon uses one lockstep release for the 17 packages in
[`package-contract.json`](../package-contract.json). The executable release
contract is [`release/release-contract.json`](../release/release-contract.json),
and `.github/workflows/release.yml` is the only supported publication path.

## Current publication state

The machine-readable package contract records `publicationState: ready` and
`scopeControl: verified` for the prepared `1.0.10` candidate. Every official
manifest is public and lockstep at `1.0.10`. Registry preflight on 2026-07-15
confirmed that all 17 contracted npm packages expose `1.0.9` as `latest` with
SLSA provenance and that `1.0.10` is absent. Immutable GitHub release `v1.0.8`
remains the current finalized release; the `v1.0.9` GitHub release remains a
draft after its public-type verification failure. This is enforced locally by:

```sh
npm run check:release-contract
```

The validator checks the package-contract JSON against its declared schema,
lockstep manifest and lockfile versions, exact
official-package dependency versions, public/provenance publish settings,
license and archive allowlists, the documentation version, and the protected
release workflow. Strict candidate validation additionally requires the exact
tested commit and successful workflow run. Released-state validation instead
proves that the immutable canonical tag is an ancestor of the current branch
and that its recorded release-cut changes contain only the two reviewed
evidence files. The one-time 1.0.7 recovery also requires its protected
recovery tag to merge both the canonical-tag and tested release-branch
histories and permits no package or application input changes.

Every current package README starts with its own generated Gluon hero under
`docs/assets/package-headers/`. The exact package name is part of the raster
artwork rather than a separate HTML heading. Each README uses an absolute
`raw.githubusercontent.com` URL because npm archives contain the README but do
not ship the repository `docs/` tree. `npm run check:packages` derives the asset
name from `package-contract.json` and rejects missing, duplicated, stale,
wrongly sized, or wrongly referenced package headers.

The immutable `v1.0.0` tag points to commit
`8f52b4b98fe9e9f5182973cbf5a0655c879df7ea`. Its Release run
`29252974864` failed in the clean-source UI typecheck before candidate artifact
creation, npm publication, or GitHub draft creation. Registry verification
after the failure found no official `1.0.0` package version.

The immutable `v1.0.1` tag points to commit
`045b1b0bbf111c06637a98f566245ae750b5bfa2`. Its Release run
`29257905859` passed candidate, browser-engine, Node-runtime, and performance
jobs, then failed reproducibility because the independently maintained build
list omitted `@gluonjs/vue-migration-analyzer`. The publish job was skipped;
registry verification found no official `1.0.1` package version, and no GitHub
release draft existed.

The immutable `v1.0.2` tag points to commit
`c5f692bbb0207ff6166136758760fceae51af5dc`. Its Release run
`29264762570` passed candidate, reproducibility, browser-engine, Node-runtime,
and performance jobs. The protected publish job then stopped before draft
creation or npm publication because `actions/setup-node` had exported its
documented placeholder `NODE_AUTH_TOKEN` while the repository prohibits every
token-shaped publication environment. Registry verification found no official
`1.0.2` package version.

The immutable `v1.0.3` tag points to commit
`7f4063936043113fc718627c9aa39606884f8e5e`. Its Release run
`29267653797` passed candidate, reproducibility, browser-engine, Node-runtime,
and performance jobs. The protected publish job then stopped before draft
creation, attestation, or npm publication because the hosting verifier's
read-only `gh api` calls did not receive GitHub's ephemeral workflow token.
Registry verification found no official `1.0.3` package version.

The immutable `v1.0.4` tag points to commit
`dc0da6e47d52cc31e1d2569bbf1fb86b3a90e054`. Its Release run
`29270008612` passed candidate, reproducibility, browser-engine, Node-runtime,
and performance jobs. The protected publish job received GitHub's ephemeral
workflow token but stopped before draft creation, attestation, or npm
publication because the immutable-releases endpoint requires repository
Administration read access, which an Actions `GITHUB_TOKEN` cannot receive.
Registry verification found no official `1.0.4` package version.

The immutable `v1.0.5` tag points to commit
`2eb36bbcbb8de70beb8cc073fdb6984f975d4a63`. Its Release run
`29272718499` passed candidate, reproducibility, browser-engine, Node-runtime,
and performance jobs. The protected publish job stopped before draft creation,
attestation, or npm publication because GitHub omits ruleset `bypass_actors`
from responses authorized by an Actions `GITHUB_TOKEN`. Registry verification
found no official `1.0.5` package version. All six failed tags remain unchanged;
recovery uses the new `1.0.6` version and tag.

The immutable canonical `v1.0.7` tag points to commit
`6c1d95a82ac0822f95550141564b93242d64d875`. Release run `29335253064`
passed all browser, Node, and performance jobs, then failed its candidate gate
because the squash merge removed the tested commit from the tag's ancestry.
The publish and reproducibility jobs were skipped, no GitHub release draft was
created, and registry verification found no official `1.0.7` package version.
The exact one-time recovery manifest is `release/recovery/1.0.7.json`. It
preserves the canonical tag, records the identical canonical and reviewed
evidence tree, and permits only the recovery workflow, validation,
documentation, and renewed evidence files to differ. Recovery execution tag
`v1.0.7-recovery.1` points to merge commit
`16355e237134b664ec385e6caeb575093eb20251`, which retains both required
histories. Release run `29338710037` passed every gate, published all 17
packages directly to `latest` through Trusted Publishing with SLSA provenance,
verified them from a clean install, and published the immutable canonical
GitHub release `v1.0.7` on 2026-07-14.

The immutable `v1.0.9` tag points to commit
`2be2dc684bb6e65de54130ea3e662d6568085d58`. Release run `29422302132`
passed its candidate, browser-engine, Node-runtime, performance, and
reproducibility jobs and published all 17 packages to `latest` with SLSA
provenance. Its clean-room public-type verification then found that the packed
Core index declaration re-exported four compiler-owned primitive-text helpers
whose declarations had been removed by `stripInternal`. The GitHub release
therefore remains a draft. Published npm versions and the protected tag are
immutable; recovery uses `1.0.10` and does not rebuild or reuse `1.0.9`.

`create-gluon` is part of the same lockstep group even though it has no runtime
dependency. Its generated UI manifest pins `@gluonjs/core`, `@gluonjs/atoms`,
`@gluonjs/reactivity`, and any selected Router, Store, SSR, test-utils, Vite, and
language-server packages to that exact release version. Candidate validation
therefore includes the 20 generated application selections so a published
`create-gluon --ui` command cannot point at a different framework version.

Issue #107's weekly DX scorecard is release-adjacent evidence, not publication
authorization. Its automated run may be retained while `humanPasses` is empty,
but it cannot satisfy the completed DX contract, replace owner-controlled
release, registry, or approval evidence, or establish a future browser/device or
assistive-technology support claim.

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

Before preparing the `1.0.10` release commit, the repository owner must verify
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
   who creates a release tag can publish immutable package versions directly
   to `latest` without another person's approval. Because npm has no atomic
   multi-package publish operation, a failed train may temporarily leave only
   part of the 17-package train on the new `latest` version.
7. Two active GitHub tag rulesets cover exactly `refs/tags/v*`. The creation
   rule gives only the `marcmalerei` user an `always` bypass so the sole
   operator can cut a release. The update and deletion rules have no bypass
   actor, making an existing release tag immutable for every user, including
   repository administrators. Immediately before committing the release
   evidence, the sole operator verifies the administration-visible ruleset
   bypass lists and records the exact ruleset IDs, creation bypass actor, empty
   immutability bypass count, operator, and check time.
8. GitHub immutable releases are enabled. Immediately before committing the
   release evidence, the sole operator verifies the administration-only
   immutable-releases endpoint and records its exact enabled and
   owner-enforcement booleans, operator, and check time in the versioned
   release-cut evidence.
9. The accepted support boundary is automated engine evidence only. Gluon 1.0
   makes no branded-browser, operating-system, device, or assistive-technology
   support claim and does not require the corresponding manual protocols.

Record the release-cut decision in `release/evidence/<version>.json` using
[`release/release-cut-evidence.schema.json`](../release/release-cut-evidence.schema.json).
Strict candidate validation requires the exact tested commit, its successful
Quality Gates run, the successful immutable-release and release-tag-ruleset
operator preflights, the contracted no-branded-support boundary, and acceptance
by the sole operator. Do not commit placeholder or inferred results.

Also freeze `release/compatibility/<version>.json` against
[`release/compatibility-manifest.schema.json`](../release/compatibility-manifest.schema.json).
It records the exact Playwright-managed Chromium, Firefox, and WebKit binaries,
Node versions, runner, execution mode, evidence identifiers, and
CSR/SSR/streaming/hydration/SSG results required by the amended ADR 0001. It
explicitly rejects branded-product support claims. Both evidence files must name
the same tested commit and successful Quality Gates run. After that commit,
strict validation permits only those two evidence files to change.

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

The reviewed release PR makes these changes together:

- set every official manifest to version `1.0.10` and `private: false`;
- set every official implementation and peer dependency to exact `1.0.10`;
- update `package-lock.json` from the resulting manifests;
- change the package contract registry state to `ready` with verified scope
  control;
- add dated `1.0.10` sections to the root and all package changelogs;
- copy and review the versioned documentation as `1.0.10`, then make that version
  latest and supported;
- after the prepared commit passes Quality Gates, attach the completed automated
  release-cut evidence and immutable compatibility manifest as the only two
  files changed after that tested commit.

Validate that commit before creating a tag:

```sh
npm ci --ignore-scripts
npm run check
npm run release:validate -- --candidate 1.0.10
npm run release:artifacts -- --version 1.0.10
```

`release:artifacts` packs every package twice and compares canonical unpacked
file SHA-256 digests. It then clean-installs all 17 local archives and
typechecks every contracted public export with `skipLibCheck: false` before
producing the package archives, aggregate and per-package SPDX 2.3 and
CycloneDX 1.7 SBOMs, `release-evidence.json`, and a `SHA256SUMS` manifest under
`.tmp/release`.

SPDX output is validated against the vendored official SPDX 2.3 JSON schema.
The release contract pins its upstream commit, source URL, and SHA-256; a schema
change therefore requires an explicit reviewed contract update.

For repository-development verification, the same artifact builder can run on
a blocked development version without making the result publishable:

```sh
npm run build
npm run release:artifacts -- --allow-blocked
```

The resulting evidence explicitly records `blockedDevelopmentBuild: true`, and
the publisher rejects it.

During the two-commit release-cut PR, `npm run check` also permits the prepared
`ready` commit to build a non-publishable artifact while both evidence files are
still absent. That artifact has the same `blockedDevelopmentBuild: true` guard.
Once the two evidence files exist, `--check-state` automatically switches to
strict candidate validation; a partial evidence pair fails immediately. The
Quality Gates repository job fetches full Git history so this strict pass can
prove that the recorded tested commit is an ancestor of the candidate commit.

After the immutable release is published, change the package contract state
from `ready` to `released`. In this state, repository `--check-state` runs still
pack the current tree twice and validate its SBOMs, but mark the result with
`blockedDevelopmentBuild: true`, omit the release-cut evidence, and use the
`Unreleased` changelog section. The publisher rejects that artifact, so later
documentation or source changes cannot claim to reproduce or overwrite the
published version. Preparing a later release requires a new target version and
the normal reviewed `ready` candidate transition.

## Protected publication

After a normal candidate PR is merged with its tested commit preserved in
history and all gates are green, create the exact reviewed `v<version>` tag.
The tag starts the `Release` workflow. Its candidate job repeats the full
repository check and artifact build. The single-operator `npm` environment then
admits the publication job without independent approval. It permits only `v*`
tags and disallows administrator bypass and long-lived npm secrets.

The canonical `v1.0.7` tag cannot be moved or deleted after the squash-merge
failure. Its only permitted recovery uses protected tag
`v1.0.7-recovery.1`. Before that tag can publish, the recovery verifier requires
the exact canonical tag commit and tree, the original tested and evidence
commits, the failed run URL, renewed evidence from a successful Quality Gates
commit, and a merge commit that contains both the canonical and reviewed branch
histories. A hard-coded allowlist excludes every package source, manifest,
README, license, and changelog path. The recovery workflow therefore publishes
the unchanged `1.0.7` archives and creates the GitHub release against canonical
tag `v1.0.7`; the recovery tag is only the protected OIDC execution ref.

The publication job verifies public repository visibility, the absence of
environment reviewers and an uncontracted wait timer, the exact `v*` tag policy,
disabled administrator bypass, live active release-tag ruleset IDs, conditions,
and rule types, the versioned operator preflight that records immutable GitHub
releases and administration-only ruleset bypass actors, and the absence of
long-lived npm token variables. All release-workflow actions are pinned to
commit SHAs. It attests archives, SBOMs, checksums, the immutable compatibility
manifest, and other evidence, then creates or updates a draft GitHub release.

The protected publication job uses `actions/setup-node` only to select
Node; it does not provide its `registry-url` input because that input writes
token-backed npm configuration and exports a placeholder `NODE_AUTH_TOKEN` even
when OIDC is intended. Publisher and registry-verification commands pass the
registry from `release/release-contract.json` explicitly. Contract validation
rejects the protected job if setup-node registry authentication returns.
Only the workflow steps that verify or update GitHub state receive GitHub's
ephemeral workflow token as `GH_TOKEN`; npm publication receives no npm token.
The hosting verifier uses that token for its live public environment,
deployment-policy, public ruleset, operator, and Quality Gates queries.
GitHub's immutable-releases
endpoint requires repository Administration read access, and GitHub omits
ruleset `bypass_actors` from non-administration responses. An Actions
`GITHUB_TOKEN` cannot receive that access, so the sole operator records both
successful administrative preflights in the versioned release-cut evidence
before tagging. The surrounding job still has no long-lived GitHub or npm
secret, and contract validation rejects either missing preflight evidence or a
verifier without the ephemeral token.

The workflow publishes every reviewed archive through npm trusted publishing
with provenance directly under `latest`. Before the first publish it proves
that all 17 npm package records already exist. After each publish it compares
registry integrity and provenance with `release-evidence.json`. A rerun skips
an already-existing version only when those facts match; a mismatch stops the
train. No long-lived npm token, `npm dist-tag` mutation, or per-package 2FA
approval is part of a supported release.

After all 17 direct publications succeed, the same protected job requires every
`latest` tag to point to the reviewed version, compares registry integrity and
provenance, performs a clean-directory install and public-type check, attaches
the registry verification and final checksum manifest, and only then publishes
the immutable GitHub release. A partial npm publication leaves the GitHub
release as a draft. Rerunning the failed job verifies and skips matching
immutable versions before continuing with the unpublished packages.

A second fresh runner runs the complete root `npm run build` for the same source
commit and compares every canonical unpacked package-file digest with the
candidate job. Release-contract validation rejects a workflow that replaces
this aggregate build with an incomplete manually maintained package list. The
publication job cannot start unless this reproducibility job passes.

A failed publication is never retried by rebuilding the same version. Preserve
the run and draft-release evidence and rerun the failed job with the same
artifacts. Matching immutable registry versions are verified and skipped;
unpublished packages continue. If any existing registry version has different
integrity or lacks provenance, stop and follow the new-version policy in ADR
0002.
