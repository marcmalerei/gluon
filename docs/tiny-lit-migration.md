# Tiny-Lit transfer record

## Source inspected

- Local snapshot: `/Users/marcelmaier/Downloads/tiny-lit-main`
- Inspection date: 2026-07-10
- The directory was not a Git worktree, so no source commit identifier was available.
- Its `package.json` named the package `gluon` at version `0.1.0`.
- Its README ended with the text `MIT`.
- The inspected snapshot contained no `LICENSE`, `LICENSE.md`, `COPYING`, or `NOTICE` file, and its `package.json` contained no `license` field.

Those incomplete snapshot files did not establish a copyright holder or license
authority. On 2026-07-10, Marc Malerei explicitly authorized Gluon under the MIT
License with `Copyright © 2026 Marc Malerei`. The repository license is therefore
based on that later authorization, not an inference from the Tiny-Lit snapshot.
See [ADR 0002](adrs/0002-package-release-and-supply-chain-governance.md)
and the root [`LICENSE`](../LICENSE).

## Transferred concepts and code paths

The following Tiny-Lit code directly supported the Gluon vision and informed the initial implementation:

| Tiny-Lit source | Gluon destination | Transfer |
| --- | --- | --- |
| `src/index.ts` | `src/runtime.ts` | `TemplateResult`, tagged templates, cached templates, direct Part paths, child updates, bindings, directives, and spreading. |
| `src/gluon-element.ts` | `src/element.ts` | Custom Element render base, declared properties, attribute conversion, reflection, and scheduled updates. |
| `src/styles.ts`, `src/global-styles.ts` | `src/styles/index.ts` | Constructable stylesheet creation and adoption. |
| `src/merge.ts` | `src/props.ts` | Additive class/style prop merging. |
| `src/ui/quarks/*` | `src/quarks/index.ts` | Native-element Quark factories and shared baseline classes. |
| `src/ui/atoms/icon.ts`, `button.ts`, `input.ts`, `label.ts` | `src/atoms/*` | Representative Atom APIs and templates. |
| `src/ui/molecules/card.ts`, `formField.ts` | `src/molecules/*` | Representative Molecule compositions. |

## Structural and behavioral changes

- Split the public package into explicit core, styles, Quarks, Atoms, Molecules, and Organisms entry points.
- Replaced per-element Quark files with the typed and cached `q.<tag>()` API.
- Added the missing Organism layer with `AppShell` and `defineOrganism`.
- Added expression indices to cached Part descriptors instead of relying on DOM walk order.
- Replaced event-property assignment with `addEventListener` and deterministic listener cleanup.
- Added template-replacement cleanup for events and refs.
- Made spread `data`, `aria`, and style reconciliation ownership-aware so unrelated attributes are preserved.
- Added object and callback refs with detach notifications.
- Removed a property-binding `console.log` from the source runtime.
- Finalized Custom Element accessors during construction; Tiny-Lit declared `_ensureAccessors()` but did not call it.
- Removed every `<style>` fallback. Gluon requires `CSSStyleSheet` and `adoptedStyleSheets`.
- Replaced import-time global style injection with explicit stylesheet adoption.
- Added real Chromium tests, strict type checking, ESM builds, and a zero-vulnerability dependency audit at transfer time.
- Updated the copied Vite 5 toolchain to Vite 8 because the transferred version was reported by `npm audit` with moderate and high vulnerabilities.

## Intentionally not transferred

These files existed in the snapshot but are outside the current Gluon foundation or conflict with its architecture:

- `src/server.ts` and `src/islands.ts`: SSR and islands are not part of this first browser runtime.
- `src/slots.ts`: the light-DOM projection helpers are separate from native Shadow DOM slots and were not required by the stated vision.
- `automation/`, `.storybook/`, and `*.stories.ts`: the initial Gluon repository uses direct browser tests instead of the snapshot's Storybook queue system.
- domain-oriented Molecules such as KPI and watchlist components: they are not general foundation primitives.
- CSS token files and `<style>` fallbacks: Gluon starts with explicit adopted sheets only.
- the Vue migration gap roadmap: it proposes future work but is not implemented runtime code.

## Verification

The transferred foundation is covered by:

- `tests/runtime.spec.ts`
- `tests/styles-and-element.spec.ts`
- `tests/quarks.spec.ts`
- `tests/layers.spec.ts`

Run `npm run check` and `npm audit --audit-level=moderate` from the Gluon repository.
