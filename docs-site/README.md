# Gluon documentation site

The documentation site is a versioned, static, code-native surface published at
`/gluon/`. `versions.json` is the source of truth for the latest and supported
documentation lines. Content for a supported line remains under
`content/<version>/`; removing it requires the matching release line to leave
support under ADR 0002.

The site uses the same Swiss-editorial visual system as the Playground: true
white, near-black type, chartreuse primary actions, cobalt technical details,
thin rules, open rails, and square geometry. The accepted full desktop/mobile
concept is [`design/docs-concept.png`](design/docs-concept.png).
The verified browser renders are
[`design/rendered-docs-desktop.png`](design/rendered-docs-desktop.png) at
1536×1024 and [`design/rendered-docs-mobile.png`](design/rendered-docs-mobile.png)
at 390×844.
The beginner component path is verified by
[`design/rendered-components-desktop.png`](design/rendered-components-desktop.png)
at 1440×1000,
[`design/rendered-components-mobile.png`](design/rendered-components-mobile.png)
at 390×844, and the focused
[`design/rendered-gluon-element-desktop.png`](design/rendered-gluon-element-desktop.png)
API reference at 1440×1000.
The package-specific header artwork contract is verified on the rendered
`@gluonjs/atoms` GitHub README by
[`design/rendered-package-readme-desktop.png`](design/rendered-package-readme-desktop.png)
at 1440×1000 and
[`design/rendered-package-readme-mobile.png`](design/rendered-package-readme-mobile.png)
at 390×844.

## Commands

```sh
npm run typecheck:docs
npm run docs:api
npm run build:docs
npm run check:docs
```

TypeDoc reads every current public entry point declared by the package contract
and emits reviewed Markdown into `.tmp/docs-api`.
`generate-api-examples.mjs` then derives every public function, class,
interface, type-alias, and variable page, maps it back to an official package
entry point, appends an `Example` section, and typechecks the complete generated
snippet corpus. `api-examples.json` maps all 584 current symbol pages to reviewed
task-oriented examples. Related symbols may share a maintained application
recipe, but every page has its own purpose statement and the compiled recipe
must use that documented symbol. Unknown pages, missing catalog entries, private
modules, invalid snippets, duplicate external example sections, or incomplete
symbol coverage fail `npm run docs:api`.

`build-docs.mjs` renders that reference beside the maintained guides, cookbook,
migration material, examples, and release archive. `validate-docs.mjs` verifies
the version tree, public API entry-point count, one rendered example per public
symbol page, required curated content, compiled examples, and internal links.
The maintained component guide is the beginner entry point for properties,
attributes, events, lifecycle ownership, and the complete public class map.
TypeDoc excludes externally inherited DOM members so an API page keeps its
Gluon-owned contract in view while still naming its platform base type.

The reviewed catalog covers Core rendering and application ownership,
reactivity, Router, Store, SSR/hydration/streaming/static generation, layered UI,
test fixtures, compiler/Vite, diagnostics, Devtools, language tooling,
scaffolding, and Vue migration analysis. Examples show concrete configuration,
observable results, lifecycle ownership, failure handling, and cleanup where the
API requires them. The gate rejects compiler-only constructs such as declared
argument tuples, empty type aliases, or bare value reads, as well as the former
generic runtime-owner copy.

All TypeScript and Vue example sources live in `examples/` and are compiled
through `examples/tsconfig.json` plus the maintained Vite configurations;
Markdown includes those exact files rather than copied snippets. `plain.html`
and `vue.html` are the runnable interoperability hosts. The Vue host consumes
the production GLUON GOODS product configurator with an explicit
`isCustomElement` compiler boundary. Its verified renders are
[`design/rendered-vue-migration-desktop.png`](design/rendered-vue-migration-desktop.png)
at 1440×1000 and
[`design/rendered-vue-migration-mobile.png`](design/rendered-vue-migration-mobile.png)
at 390×844.

The versioned Migration entry links to the tested
[Vue-to-Gluon cutover playbook](content/1.0.10/migration/vue-to-gluon-cutover/index.md).
The guide keeps Vue and Gluon
application ownership explicit for every stage and embeds the compiled Vue host
sources instead of maintaining copied snippets. `validate-docs.mjs` requires the
page, its safety boundary, its rollback matrix, and its browser-evidence links.
The Migration index and analyzer guide document RFC 0003's implemented
report-only package, CLI, schema, diagnostics, limits, and no-write boundary.
Documentation validation requires the guide and its public package references.
The versioned
[codemod decision](content/1.0.10/migration/vue-codemod-decision/index.md)
records the issue #92 no-go, corpus-only measurements, explicit candidate
classifications, counterexamples, and the continuing manual-review boundary.
The verified analyzer-guide renders are
[`design/rendered-vue-analyzer-guide-desktop.png`](design/rendered-vue-analyzer-guide-desktop.png)
at 1440×1000 and
[`design/rendered-vue-analyzer-guide-mobile.png`](design/rendered-vue-analyzer-guide-mobile.png)
at 390×1200.
The verified codemod-decision renders are
[`design/rendered-vue-codemod-decision-desktop.png`](design/rendered-vue-codemod-decision-desktop.png)
at 1440×1000 and
[`design/rendered-vue-codemod-decision-mobile.png`](design/rendered-vue-codemod-decision-mobile.png)
at 390×1200.
The verified RFC-boundary renders are
[`design/rendered-vue-analyzer-rfc-desktop.png`](design/rendered-vue-analyzer-rfc-desktop.png)
at 1440×1000 and
[`design/rendered-vue-analyzer-rfc-mobile.png`](design/rendered-vue-analyzer-rfc-mobile.png)
at 390×1200.
The verified playbook renders are
[`design/rendered-vue-cutover-desktop.png`](design/rendered-vue-cutover-desktop.png)
at 1440×1000 and
[`design/rendered-vue-cutover-mobile.png`](design/rendered-vue-cutover-mobile.png)
at 390×844.
