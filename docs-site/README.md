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
snippet corpus. Curated examples live in `api-examples.json`; unknown pages,
private modules, invalid snippets, duplicate external example sections, or
missing symbol coverage fail `npm run docs:api`.

`build-docs.mjs` renders that reference beside the maintained guides, cookbook,
migration material, examples, and release archive. `validate-docs.mjs` verifies
the version tree, public API entry-point count, one rendered example per public
symbol page, required curated content, compiled examples, and internal links.

Generated baselines synthesize representative primitive values, object
configurations, callbacks, component properties, and function calls from the
public TypeDoc reflection. They must not contain compiler-only constructs such
as declared argument tuples, empty type aliases, or bare value reads.

Some APIs consume Router, Store, DOM, server, or test objects that the
application or framework must already own. For those pages the generator emits
a typed consumption example instead of fabricating an invalid lifecycle.
Behavior-oriented examples live in `api-examples.json` when setup, ownership,
cleanup, errors, or multiple public entry points need to be shown together.
The catalog currently curates memory history, Router options, Store definition,
and Gluon Element class/HMR flows.

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
[Vue-to-Gluon cutover playbook](content/0.0.0/migration/vue-to-gluon-cutover/index.md).
The guide keeps Vue and Gluon
application ownership explicit for every stage and embeds the compiled Vue host
sources instead of maintaining copied snippets. `validate-docs.mjs` requires the
page, its safety boundary, its rollback matrix, and its browser-evidence links.
The Migration index and analyzer guide document RFC 0003's implemented
report-only package, CLI, schema, diagnostics, limits, and no-write boundary.
Documentation validation requires the guide and its public package references.
The versioned
[codemod decision](content/0.0.0/migration/vue-codemod-decision/index.md)
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
