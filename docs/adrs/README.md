# Gluon architecture decision records

Accepted ADRs define technical constraints that every implementation and release
must satisfy. A roadmap issue may refine an implementation, but it must not
weaken an accepted ADR without a superseding decision record.

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-browser-runtime-and-style-transport.md) | Accepted | Browser, runtime, adopted stylesheet, and SSR style transport contract |
| [0002](0002-package-release-and-supply-chain-governance.md) | Accepted | Package topology, licensing, releases, and supply-chain governance |

## Process

1. Open a GitHub issue with the decision scope and acceptance criteria.
2. Verify current repository behavior and applicable primary standards sources.
3. Draft the ADR on an issue branch and link affected public documentation.
4. Merge the ADR through a pull request. The merge records acceptance.
5. Use a superseding ADR when an accepted architectural constraint changes.
