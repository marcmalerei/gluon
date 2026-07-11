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

All TypeScript examples live in `examples/` and are compiled through
`examples/tsconfig.json`; Markdown includes those exact files rather than copied
snippets. `plain.html` and `vue.html` are the runnable interoperability hosts.
