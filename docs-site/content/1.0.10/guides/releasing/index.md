# Release readiness

The `1.0.10` documentation describes the completed lockstep release. All 17
official manifests and npm packages are at `1.0.10`. Release run `29426558738`
attempt 2 published every package under `latest` with SLSA provenance, passed
clean-room installation and public-type verification, and published immutable
GitHub release `v1.0.10` on 2026-07-15. The `v1.0.9` GitHub release remains a
draft after its public-type verification failure. The `@gluonjs` scope,
package records, and trusted-publisher bindings are verified in the package
contract.

Gluon's release group contains 17 lockstep packages. The repository validates
their common version, exact official dependencies, package contents,
documentation version, license, changelogs, provenance settings, and protected
workflow with:

```sh
npm run check:release-contract
```

A release-candidate commit must additionally pass the complete repository check
and strict candidate validation. The release artifact builder creates
reproducible package-content digests, clean-installs all 17 local archives,
typechecks every contracted public export, and creates SPDX 2.3 and CycloneDX
1.7 SBOMs for each package and the aggregate release, SHA-256 checksums, and
machine-readable build evidence. The official SPDX schema is vendored with a
pinned upstream commit and SHA-256.

The release cut requires verified public repository visibility, npm scope
control, the accepted single-owner recovery and multi-factor-authentication
controls, existing owner-controlled package records, trusted-publisher
bindings, the single-operator `npm` environment and tag rules, and immutable
GitHub releases. `marcmalerei` is the sole required npm owner; a second owner is
not required. The owner uses `auth-and-writes` 2FA, keeps the npm account linked
to GitHub, and retains current recovery codes outside the second-factor device.
Loss of the sole owner account can stop package administration and require npm
Support account recovery. Repository validation does not prove where recovery
codes are stored.

The `npm` environment uses the accepted single-operator model. It has no
required reviewers, independent human approval, self-review rule, or wait
timer; permits only the `v*` tag pattern; and disallows administrator bypass and
long-lived npm secrets. This accepts that the sole operator can create a release
tag that permanently publishes package versions directly under `latest`
without another person's approval. npm does not provide an atomic
multi-package publish operation, so a failed train can temporarily leave only
part of the 17-package train on the new `latest` version.

Two active tag rulesets cover exactly `refs/tags/v*`. Only `marcmalerei` may
bypass the creation restriction, so the sole operator can cut a release. The
separate update and deletion restrictions have no bypass actor; an existing
release tag therefore cannot be rewritten or deleted, including by a repository
administrator.

Strict validation requires a machine-readable release-cut record containing the
exact tested commit, its successful Quality Gates run, the sole operator's
administrative verification that immutable GitHub releases are enabled and
that the exact tag-ruleset bypass lists match the contract, and the operator's
acceptance of the automated-only support boundary. Gluon 1.0 makes no branded
browser, operating-system, device, or assistive-technology support claim and
does not require manual evidence for those combinations.

The same release cut freezes an immutable compatibility manifest with exact
Playwright Chromium, Firefox, and WebKit binaries, Node LTS versions, and
CSR/SSR/streaming/hydration/SSG evidence. Both evidence files must describe the
same tested commit and explicitly reject branded-product support claims.

Publication uses one recoverable protected job. Trusted publishing places all
17 reviewed versions directly under `latest` with provenance and without a
long-lived npm token or per-package 2FA approval. A rerun verifies and skips
matching immutable versions before continuing unpublished packages. The GitHub
release remains a draft until the complete train passes integrity, provenance,
dist-tag, clean-install, and public-type verification.

The immutable `v1.0.0` tag failed its candidate gate before release artifacts,
an npm publication, or a GitHub release draft existed. The immutable `v1.0.1`
tag passed candidate, browser, Node, and performance gates, then failed because
the reproduction build omitted `@gluonjs/vue-migration-analyzer`; its publish
job was skipped and no npm version or GitHub draft was created. The immutable
`v1.0.2` tag passed all release gates, then stopped before draft creation or npm
publication because setup-node registry authentication exported a placeholder
`NODE_AUTH_TOKEN` that the no-token policy rejected. The immutable `v1.0.3` tag
passed every release and reproducibility gate, then stopped before draft or npm
publication because hosting verification lacked GitHub's ephemeral workflow
token for its read-only API checks. The immutable `v1.0.4` tag passed every
release and reproducibility gate, then stopped before draft or npm publication
because the immutable-releases endpoint requires Administration read access
that an Actions `GITHUB_TOKEN` cannot receive. The immutable `v1.0.5` tag also
passed every release and reproducibility gate, then stopped before draft or npm
publication because GitHub omits ruleset `bypass_actors` from non-administration
responses. The `1.0.6` release line used the complete root build, left
setup-node registry authentication disabled, passed the contracted registry
explicitly to npm, recorded the operator's successful immutable-release and
ruleset-bypass preflights in versioned release-cut evidence, and completed
publication on 2026-07-14. The `1.0.7` line additionally publishes directly to
`latest` through trusted publishing and verifies the complete train before
finalizing the GitHub release. The failed tags are not moved or reused.

The first immutable canonical `v1.0.7` tag passed its browser, Node, and
performance jobs but stopped before reproducibility, npm publication, or a
GitHub draft. PR #157 had been squash-merged, so the recorded tested commit was
not an ancestor of the tagged commit even though the reviewed evidence commit
and tag have the same tree. The canonical tag remains unchanged. Its one-time
machine-verified recovery uses protected execution tag
`v1.0.7-recovery.1`, which must merge both histories and may change only the
release workflow, recovery validation, documentation, and renewed evidence
paths. Package sources, manifests, READMEs, licenses, and changelogs cannot
differ. Trusted Publishing still publishes version `1.0.7`, and the GitHub
release remains attached to canonical tag `v1.0.7`. Recovery execution tag
`v1.0.7-recovery.1` retained both required histories at merge commit
`16355e237134b664ec385e6caeb575093eb20251`; release run `29338710037` then
passed every gate, published all 17 packages to `latest` with SLSA provenance,
verified a clean install, and published the immutable canonical GitHub release
on 2026-07-14.

The immutable `v1.0.9` tag points to commit
`2be2dc684bb6e65de54130ea3e662d6568085d58`. Release run `29422302132`
passed its candidate, browser, Node, performance, and reproducibility gates and
published all 17 packages to `latest` with SLSA provenance. Clean-room public
type verification then found a broken Core declaration re-export, so the
GitHub release remains a draft. The immutable npm versions and tag are not
reused; `1.0.10` contains the corrected declaration bundle and a prepublication
archive typecheck.

The maintained [release operations runbook](https://github.com/marcmalerei/gluon/blob/main/docs/releasing.md)
defines the exact candidate, tag, protected publication, registry verification,
and failure-handling procedure.
