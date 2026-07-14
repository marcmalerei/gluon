<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/gluon-hero.jpg" alt="Gluon @gluonjs/vue-migration-analyzer — native UI layers growing from a glowing core" width="100%">
</p>

<h1 align="center">Gluon / <code>@gluonjs/vue-migration-analyzer</code></h1>
<!-- gluon-package-header:end -->

This Node-only package statically inventories the Vue 3.5 project surface
accepted by [RFC 0003](../../docs/rfcs/0003-report-only-vue-migration-analyzer.md).
It emits migration evidence; it does not execute project code, compile an
application, generate Gluon source, modify files, or establish behavioral
equivalence.

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
