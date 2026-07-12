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
and emits reviewed Markdown into `.tmp/docs-api`. `build-docs.mjs` renders that
reference beside the maintained guides, cookbook, migration material, examples,
and release archive. `validate-docs.mjs` verifies the version tree, public API
entry-point count, required pages, examples, and internal links.

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
