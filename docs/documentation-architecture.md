# Documentation architecture

This document is the repository-level plan for keeping Gluon's documentation
findable, version-correct, and maintainable. It is a contributor reference;
the public entry point remains the VitePress site.

## Goals

- Let a new user reach a working application through one progressive path.
- Let an experienced user find a package boundary, recipe, or exact API without
  reading the learning path first.
- Keep public documentation, package READMEs, internal contracts, and release
  evidence distinct instead of maintaining competing copies of the same prose.
- Make version drift and README drift fail a local check.

The model takes the useful information scent from the [Vue introduction](https://vuejs.org/guide/introduction),
its [progressive guide](https://vuejs.org/guide/essentials/application),
[scaling/tooling area](https://vuejs.org/guide/scaling-up/tooling), and explicit
migration area. It is adapted to Gluon's package and public-boundary model
rather than copying Vue's framework terminology.

## Public information architecture

The VitePress home page is the decision page. It answers what Gluon is, gives a
short path to a generated application, and sends readers to one of five stable
areas:

| Area | User question | Canonical route |
| --- | --- | --- |
| Learn | How do I build a real application progressively? | `/latest/guides/` |
| Reference | Which package or exact contract owns this? | `/latest/packages/`, `/latest/api/`, `/latest/reference/` |
| Recipes | How do several packages work together? | `/latest/cookbook/` |
| Migration | How do I come from Vue, Lit, or an older Gluon line? | `/latest/migration/` |
| Try it | Can I reproduce this in the browser or inspect a complete app? | `/playground/`, GLUON GOODS |

The guide landing page groups content into the same progression used by the
navigation:

1. Essentials: getting started, learning path, and the first stateful
   component.
2. Build an application: components, application architecture, and async data.
3. Render and ship: universal rendering, tooling, quality, deployment, and
   release readiness.

The reference landing page groups support matrix, forms, hydration, deployment,
diagnostics, and documentation governance. Packages and generated API remain
separate because a package comparison is a different task from symbol lookup.

## Source-of-truth map

| Content | Source of truth | Published how |
| --- | --- | --- |
| Home and task guides | `docs-site/content/<version>/` plus explicitly included repository contracts | VitePress version route |
| Package purpose, install, quick start, limits, and package examples | Package `README.md` and `docs-site/package-docs.json` | README, npm, and generated package page |
| API signatures and symbol examples | Public exports in `package-contract.json` and source declarations | Generated TypeDoc pages |
| Cross-package recipes | `docs-site/content/<version>/cookbook/` and compiled files in `docs-site/examples/` | VitePress plus executable examples |
| Architecture decisions | `docs/adrs/` and `docs/rfcs/` | Repository reference; link from public pages when relevant |
| Normative runtime, security, accessibility, and release contracts | `docs/*.md` with an explicit public link or an included page | Repository source and selected VitePress pages |
| Benchmark results and CI evidence | `docs/`, `benchmarks/`, and retained machine-readable output | Evidence/reference only, never a marketing claim |
| Historical release documentation | `docs-site/content/<version>/` outside `versions.json.supported` and release history | Archive route or repository history; excluded from current build |

There must be one canonical source per audience. A page may include a source
file, but a hand-maintained duplicate with the same contract is not canonical.
Generated API and package routes are artifacts and must be regenerated rather
than edited by hand.

## Version policy

- `docs-site/versions.json` is the authoritative list of supported lines.
- `latest` is a version-independent alias generated from the latest supported
  line; it is not a second source tree.
- A release directory that is no longer supported is retained only when its
  release evidence or user-facing upgrade value justifies it. It must be
  excluded from the current build and named in the archive index.
- Release-specific claims must use the versioned page. Current operational
  status belongs in the current release guide and release contract, not in a
  historical handoff paragraph.

## Staleness taxonomy

The repository does not delete a document merely because its modification date
is old. Every candidate is assigned one of these states:

| State | Meaning | Action |
| --- | --- | --- |
| Current | Describes the current public contract or current workflow | Keep, link, and test |
| Versioned | Correct for a supported release line | Keep under that version and regenerate on release |
| Archived | Correct historical material outside the supported set | Keep out of the current build and link from the archive |
| Evidence | Reproducible historical result, benchmark, or release proof | Keep with date, environment, scope, and limitations |
| Internal | Contributor or implementation detail not intended as product guidance | Keep under `docs/`, link from contributor material only |
| Candidate for retirement | Duplicate, contradicted, orphaned, or no longer reproducible | Open a scoped issue, replace or remove after proof |

The audit in [`documentation-audit.md`](documentation-audit.md) records the
current classification. A stale version mention is not by itself proof that
the entire file is obsolete; release histories and benchmark evidence are
expected to contain historical versions.

## README architecture

README files are entry pages for GitHub and npm, not a second documentation
portal. Their common structure is defined in
[`readme-contract.md`](readme-contract.md) and checked by
`npm run check:readmes`.

- The root README explains the product, gives the shortest start path, maps the
  packages, and links into the public site.
- Package READMEs share a generated package overview and then contain the
  package-specific guide and examples.
- Example READMEs explain purpose, run commands, verification, and boundary;
  they do not become a catalogue of unrelated demos.
- Benchmark READMEs explain workload, command, retained evidence, and limits.
- ADR, RFC, and diagnostics READMEs are indexes with process/status context.

## Delivery sequence

1. Keep the source-of-truth map and audit current when a package, release line,
   or public guide changes.
2. Add the public page to the appropriate VitePress landing page and sidebar.
3. Add executable examples or browser evidence for user-visible capabilities.
4. Run `npm run check:readmes` and the relevant documentation checks.
5. Review the local VitePress site at desktop and mobile widths before merge.

This arrangement keeps VitePress as the public information architecture while
allowing repository contracts and evidence to remain precise without flooding
the main user navigation.
