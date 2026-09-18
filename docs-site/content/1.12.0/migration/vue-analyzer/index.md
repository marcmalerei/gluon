# Report-only Vue migration analyzer

`@gluonjs/vue-migration-analyzer` statically inventories the Vue 3.5 project
surface accepted by RFC 0003. It maps evidence to the six stages in the
[Vue-to-Gluon cutover playbook](../vue-to-gluon-cutover/). It does not execute
application, configuration, plugin, test, loader, or package code.
It does not write, format, generate, rename, or delete project files.

## CLI

```sh
gluon-vue-analyze [root] [--format human|json]
gluon-vue-analyze --help
gluon-vue-analyze --version
```

The root defaults to the current directory. Human output is deterministic
review output. JSON is the automation contract and validates against the
`schemaVersion` `1.0.0` schema exported from
`@gluonjs/vue-migration-analyzer/schema`. Both formats go to stdout; fatal
invocation messages go to stderr.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Analysis completed without an error finding. |
| `1` | Analysis completed with unsupported, malformed, or other error findings. |
| `2` | Root, invocation, permission, or fatal serialization failed. |
| `3` | A fixed path, file, byte, AST, depth, worker-memory, or worker-time limit failed (`GVA9002`). |

Warnings are successful inventory but still require the linked human review.
Unknown syntax is never reported as a successful Gluon mapping.

## Supported boundary

Schema version 1 accepts Vue `>=3.5.0 <3.6.0`, an exact manifest or npm
lockfile version, JavaScript/TypeScript Vue SFC scripts, script setup and static
Options API declarations, ordinary Vue templates, and CSS style blocks. It
inventories props, emits, models, slots, directives, refs, reactivity,
lifecycle, Router, Pinia/Vuex, async components, styles, SSR/hydration, tests,
and Vite configuration.

Vue 2, unresolved/out-of-range Vue versions, JSX/TSX, external or custom SFC
blocks, custom macros/directives, CSS preprocessors, Nuxt, Vue CLI/webpack,
dynamic identities, and runtime-generated behavior produce explicit error or
indeterminate findings. Router, Store, async, scoped/module CSS, SSR/hydration,
test, and build evidence is structural and never a behavioral-equivalence
claim.

## Security and privacy

The analyzer realpath-checks one root, never follows symbolic links, excludes
dependency/build directories, parses in a memory-limited worker, enforces fixed
file/byte/AST/depth/time budgets, and performs no network or telemetry access.
Reports contain normalized relative paths, declared names, static import
sources, locations, categories, and byte digests. They omit source excerpts,
absolute paths, timestamps, host identity, and environment data.

The retained supported, unsupported, malformed, and adversarial fixtures prove
that package scripts, imports, Vite config, and plugin-like files are not
executed. Repeated analysis must produce byte-identical reports.

## Programmatic API

The root export provides `analyzeVueMigration({ root })`,
`formatVueMigrationReport(report, 'human' | 'json')`, the public report types,
the frozen limits, and the schema-version constant. The `./schema` entry exports
the deeply frozen JSON Schema. No visitor, plugin, evaluator, transform, or
writer hook is public.

This developer tool has no customer-facing GLUON GOODS control. Its integration
evidence analyzes `VueProductHost.vue`, while the production configurator and
browser tests remain the behavioral evidence for the linked migration stages.

## Codemod decision

The retained analyzer corpus informed a separate
[bounded codemod evaluation](../vue-codemod-decision/). Its result is no-go for
a source writer: 14 candidate classes have static evidence, but none has a
retained generated target plus semantic acceptance proof. RFC 0003 therefore
remains report-only, and this package exposes no transform or write API.
