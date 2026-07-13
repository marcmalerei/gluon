# Release readiness

The `1.0.3` documentation describes the first supported public release line.
The `@gluonjs` scope, all 17 package records, and their trusted-publisher
bindings are verified in the package contract.

Gluon's release group contains 17 lockstep packages. The repository validates
their common version, exact official dependencies, package contents,
documentation version, license, changelogs, provenance settings, and protected
workflow with:

```sh
npm run check:release-contract
```

A release-candidate commit must additionally pass the complete repository check
and strict candidate validation. The release artifact builder creates
reproducible package-content digests, SPDX 2.3 and CycloneDX 1.7 SBOMs for each
package and the aggregate release, SHA-256 checksums, and machine-readable build
evidence. The official SPDX schema is vendored with a pinned upstream commit and
SHA-256.

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
tag that permanently publishes package versions under the staging dist-tag
without another person's approval. Interactive-2FA promotion to `latest`
remains a separate later step and does not reverse that publication.

Two active tag rulesets cover exactly `refs/tags/v*`. Only `marcmalerei` may
bypass the creation restriction, so the sole operator can cut a release. The
separate update and deletion restrictions have no bypass actor; an existing
release tag therefore cannot be rewritten or deleted, including by a repository
administrator.

Strict validation requires a machine-readable release-cut record containing the
exact tested commit, its successful Quality Gates run, and the sole operator's
acceptance of the automated-only support boundary. Gluon 1.0 makes no branded
browser, operating-system, device, or assistive-technology support claim and
does not require manual evidence for those combinations.

The same release cut freezes an immutable compatibility manifest with exact
Playwright Chromium, Firefox, and WebKit binaries, Node LTS versions, and
CSR/SSR/streaming/hydration/SSG evidence. Both evidence files must describe the
same tested commit and explicitly reject branded-product support claims.

Publication uses two recoverable phases. Trusted publishing first places all 17
reviewed versions under a temporary non-`latest` dist-tag and verifies registry
integrity and provenance. An npm owner then promotes every package to `latest`
with interactive 2FA. A protected finalizer verifies the complete train and a
clean-room install before publishing the immutable GitHub release.

The immutable `v1.0.0` tag failed its candidate gate before release artifacts,
an npm publication, or a GitHub release draft existed. The immutable `v1.0.1`
tag passed candidate, browser, Node, and performance gates, then failed because
the reproduction build omitted `@gluonjs/vue-migration-analyzer`; its publish
job was skipped and no npm version or GitHub draft was created. The immutable
`v1.0.2` tag passed all release gates, then stopped before draft creation or npm
publication because setup-node registry authentication exported a placeholder
`NODE_AUTH_TOKEN` that the no-token policy rejected. The `1.0.3` release line
uses the complete root build, leaves setup-node registry authentication disabled
in protected jobs, and passes the contracted registry explicitly to npm. The
failed tags are not moved or reused.

The maintained [release operations runbook](https://github.com/marcmalerei/gluon/blob/main/docs/releasing.md)
defines the exact candidate, tag, protected publication, registry verification,
and failure-handling procedure.
