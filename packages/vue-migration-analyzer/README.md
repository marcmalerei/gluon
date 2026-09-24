<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/vue-migration-analyzer.png" alt="@gluonjs/vue-migration-analyzer — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

# @gluonjs/vue-migration-analyzer

This Node-only package statically inventories the Vue 3.5 project surface
accepted by [RFC 0003](../../docs/rfcs/0003-report-only-vue-migration-analyzer.md).
It emits migration evidence; it does not execute project code, compile an
application, generate Gluon source, modify files, or establish behavioral
equivalence.

<!-- gluon-package-overview:start -->
## @gluonjs/vue-migration-analyzer at a glance

**Runtime:** node · **Release:** 1.12.3

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/vue-migration-analyzer/) · [npm](https://www.npmjs.com/package/@gluonjs/vue-migration-analyzer) · [Source](https://github.com/marcmalerei/gluon/blob/main/packages/vue-migration-analyzer/README.md)

**Public API:** [`@gluonjs/vue-migration-analyzer`](https://marcmalerei.github.io/gluon/1.12.3/api/generated/packages/vue-migration-analyzer/src/) · [`@gluonjs/vue-migration-analyzer/schema`](https://marcmalerei.github.io/gluon/1.12.3/api/generated/packages/vue-migration-analyzer/src/schema/)

### Install

```sh
npm install @gluonjs/vue-migration-analyzer
```

### Quick start

```sh
gluon-vue-analyze .
gluon-vue-analyze . --format json
```

### Choose this package when

- Inventory Vue source surfaces without executing project code.
- Report-only migration evidence for the Gluon Vue cutover path.
- Schema-backed CLI analysis for repository reviews.

**Choose another boundary when:**

- Does not generate Gluon source or modify files.
- Does not establish behavioral equivalence.

### Related documentation

- [Vue migration analyzer](https://marcmalerei.github.io/gluon/latest/migration/vue-analyzer/)
- [Vue cutover](https://marcmalerei.github.io/gluon/latest/migration/vue-to-gluon-cutover/)

<!-- gluon-package-overview:end -->

```sh
gluon-vue-analyze .
gluon-vue-analyze . --format json
```

The root export provides `analyzeVueMigration()` and
`formatVueMigrationReport()`. `@gluonjs/vue-migration-analyzer/schema` exports
the frozen schema value matching `schemas/vue-migration-report.schema.json`.
JSON is the automation contract; human output is deterministic review output.

Exit code `0` means there is no error finding, `1` means analysis completed
with an error finding, `2` is an invocation/fatal I/O failure, and `3` means a
fixed resource budget was exceeded. Warnings always require the human review
named by their cutover-stage link.

Reports contain normalized relative paths, source ranges, declared identifiers,
static import sources, and byte digests. They omit source excerpts, absolute
paths, timestamps, host data, and environment data. Symbolic links are never
followed. Output is written only to stdout/stderr.

## Verification

```sh
npm run typecheck:vue-analyzer
npm run test:vue-analyzer
npm run build:vue-analyzer
node packages/vue-migration-analyzer/dist/src/cli.js packages/vue-migration-analyzer/fixtures/supported --format json
```

The retained fixture corpus covers supported, unsupported, malformed, and
adversarial project forms. The production `docs-site/examples/VueProductHost.vue`
is also analyzed by the integration suite. Findings link to the versioned
Vue-to-Gluon cutover playbook.

## License

MIT License, Copyright © 2026 Marc Malerei.
