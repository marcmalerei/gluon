# Documentation audit

Audit date: 2026-09-29. This is a repository audit, not a claim that every
historical statement has been rewritten. Status is based on the checked-out
tree and live release/registry checks performed for this documentation slice.

## Verified inventory

| Area | Observed state | Classification | Action |
| --- | --- | --- | --- |
| `docs-site/content/1.13.0/` | Current 22-package, version-matched VitePress content | Current | Keep as the current public source tree |
| `docs-site/content/1.12.3/` | Retained versioned copy; `versions.json` supports only `1.13.0`, and `srcExclude` excludes archived versions | Archived | Keep for history/upgrade context; do not expose it in the current sidebar |
| `docs-site/content/archive/` | Release catalogue for supported and historical lines | Archive index | Clarify that not every historical line is materialized in this checkout |
| `docs/*.md` | Mix of published contracts, internal architecture, benchmark evidence, and release history | Mixed by design | Use explicit links and the taxonomy in `documentation-architecture.md`; do not treat the directory as one public section |
| `packages/*/README.md` plus root `README.md` | Generated package overview blocks are consistent and validated; package-specific bodies vary by capability | Current | Keep the generated boundary and apply the README contract to new or edited files |
| `examples/*/README.md` | Maintained examples had different heading conventions and varying levels of run/verification guidance | Structure debt | Normalize to `Purpose`, `Run`, and `Verify` |
| `benchmarks/*/README.md` | Benchmark pages documented useful workloads but did not share an entry structure | Structure debt | Normalize to `Purpose`, `Run`, and `Interpret results`; keep DX fixture READMEs fixture-specific |

## Documents requiring correction

The following were verified as stale at audit time and are corrected in this
slice:

1. `docs/releasing.md` described `1.12.3` as the current publication state and
   `1.13.0` as an unpublished candidate. The live GitHub release `v1.13.0` is
   published and npm reports `@gluonjs/core@1.13.0` as `latest`.
2. `docs-site/content/1.13.0/guides/releasing/index.md` repeated the candidate
   wording and is updated to describe the published current line.
3. `docs-site/content/archive/index.md` is clarified so its historical list is
   not mistaken for the set of materialized, currently buildable version trees.

## Documents intentionally not deleted

The following are old-looking but not proven obsolete:

- older release handoffs in `docs/releasing.md` and the release archive;
- historical benchmark findings under `docs/performance*.md` and
  `docs/dx-*.md`, which retain reproducibility context and limitations;
- accepted ADRs and RFCs, including supersession language;
- internal runtime, security, accessibility, and quality contracts that are
  linked by current guides or release checks.

They remain classified as evidence, internal, or archived. A later cleanup may
split the release ledger and evidence corpus into smaller files, but deletion
requires a scoped issue and a replacement link or an explicit archival reason.

## Checks

The audit is guarded by:

```sh
npm run check:readmes
npm run check:docs
```

The README check detects missing scope-specific sections and generated package
overview drift. The existing documentation gate checks version alignment,
generated package/API pages, local links, compiled examples, search behavior,
deep links, and no-script navigation.
