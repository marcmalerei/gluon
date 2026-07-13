# Release readiness

The `0.0.0` documentation describes the private development line. It is not a
published npm release and does not claim control of the `@gluonjs` scope.

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

Publication remains blocked until an owner verifies public repository
visibility, npm scope control, the accepted single-owner recovery and
multi-factor-authentication controls, existing owner-controlled package
records, trusted-publisher bindings, the protected `npm` environment and tag
rules, immutable GitHub releases, and the manual release-cut browser/device and
assistive-technology evidence. `marcmalerei` is the sole required npm owner; a
second owner is not required. The owner must use `auth-and-writes` 2FA, keep the
npm account linked to GitHub, and retain current recovery codes outside the
second-factor device. Loss of the sole owner account can stop package
administration and require npm Support account recovery. Repository validation
does not prove that the recovery codes are stored.

Strict validation requires a machine-readable, reviewed release-cut record for
all named branded browser/device and assistive-technology combinations.
Placeholders, engine substitutions, and undocumented failures do not satisfy
that gate.

The same release cut freezes an immutable compatibility manifest with exact
branded browser, engine, OS/device, Node LTS, and CSR/SSR/streaming/hydration/SSG
evidence. Both evidence files must describe the same tested commit.

Publication uses two recoverable phases. Trusted publishing first places all 17
reviewed versions under a temporary non-`latest` dist-tag and verifies registry
integrity and provenance. An npm owner then promotes every package to `latest`
with interactive 2FA. A protected finalizer verifies the complete train and a
clean-room install before publishing the immutable GitHub release.

The maintained [release operations runbook](https://github.com/marcmalerei/gluon/blob/main/docs/releasing.md)
defines the exact candidate, tag, protected publication, registry verification,
and failure-handling procedure.
