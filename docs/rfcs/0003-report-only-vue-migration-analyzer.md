# RFC 0003: Report-only Vue migration analyzer

- **Status:** Accepted
- **Decision date:** 2026-07-12
- **Tracking issue:** [#90](https://github.com/marcmalerei/gluon/issues/90)
- **Initiative tracker:** [#87](https://github.com/marcmalerei/gluon/issues/87)
- **Depends on:** [RFC 0001](0001-gluon-1.0-product-scope.md),
  [RFC 0002](0002-unified-component-model.md), [#88](https://github.com/marcmalerei/gluon/issues/88),
  and [#89](https://github.com/marcmalerei/gluon/issues/89)
- **Supersedes:** RFC 0001 only where that RFC prohibited every form of
  `.vue` parsing or Vue migration tooling

## Decision summary

Gluon may provide a Node-only, report-only analyzer that statically reads the
bounded Vue project surface defined by this RFC. The analyzer inventories
observable source constructs, emits deterministic human and JSON reports, and
links findings to the tested Vue-to-Gluon cutover stages.

This decision changes one part of RFC 0001's automation boundary: an official
tool may parse supported Vue source for static migration inventory. It does not
authorize Vue runtime or API compatibility, production SFC compilation,
application or configuration execution, behavioral inference, Gluon source
generation, source rewriting, or a migration codemod. Those remain out of
scope. A write-capable tool still requires a later accepted RFC.

The analyzer is additive developer tooling and is not a Gluon 1.0 completion
gate. Issue #91 owns implementation. Merging this RFC records the contract; it
does not claim that the analyzer package or CLI already exists.

## Why this decision exists

The production `gluon-product-configurator` from #88 proves a native Custom
Element boundary in GLUON GOODS and a Vue 3 host. The versioned playbook from
#89 defines six reversible migration stages and the owner, transport, teardown,
and rollback rules for each stage. Neither surface inventories an existing Vue
project.

RFC 0001 correctly prevented an analyzer from appearing without a supported
input, safety, failure, and compatibility contract. This RFC introduces only
the static evidence needed to plan the manual stages. It keeps unknown syntax
visible instead of manufacturing a Gluon mapping.

## Product boundary

The analyzer answers these questions:

- Which supported Vue components and project files were found?
- Which statically declared props, emits, models, slots, directives, reactive
  primitives, lifecycle calls, routes, stores, async boundaries, styles,
  server paths, tests, and build integrations are present?
- Which cutover stage owns each finding?
- Which constructs are exact inventory, structural evidence requiring review,
  indeterminate, unsupported, malformed, or over a resource limit?

The analyzer does not answer these questions:

- What does arbitrary application code do at runtime?
- Is a component behaviorally equivalent to proposed Gluon source?
- Can a Vue Router, Pinia, Vuex, SSR, scoped-style, directive, plugin, or async
  behavior be translated automatically?
- Is a project fully migratable?
- Which source edit should be applied?

No successful report is a source-compatibility or conversion claim.

## Package and public entry points

Issue #91 will add one official package to the lockstep release group:

| Contract | Decision |
| --- | --- |
| Package | `@gluonjs/vue-migration-analyzer` |
| Environment | Node only |
| Public exports | `.` and `./schema` |
| Executable | `gluon-vue-analyze` |
| Official Gluon dependencies | None |
| Runtime package dependencies | None on Core, Reactivity, Router, Store, SSR, Compiler, Vite, or UI packages |
| Third-party parser dependencies | Pinned parser libraries used only inside this Node package |

The root export owns the programmatic analysis and formatting API. The
`./schema` export owns the JSON Schema value and matching public report types.
The CLI is a thin consumer of the same API. Parser implementation details and
their AST types are not public exports.

The planned public API is:

```ts
export const VUE_MIGRATION_REPORT_SCHEMA_VERSION: '1.0.0';
export function analyzeVueMigration(
  options: Readonly<{ root: string }>,
): Promise<VueMigrationReport>;
export function formatVueMigrationReport(
  report: VueMigrationReport,
  format: 'human' | 'json',
): string;
```

No plugin, callback, evaluator, transform, visitor, writer, or configuration
hook is public in schema version 1.

When implementation begins, the package contract, release contract,
lockfile, changelogs, documentation API generation, release artifacts, SBOMs,
and clean-install fixtures must include the package. If Gluon 1.0 is released
first, the analyzer can enter only a later lockstep release. This initiative
does not block issue #41.

## CLI contract

The complete schema-version-1 command surface is:

```text
gluon-vue-analyze [root] [--format human|json]
gluon-vue-analyze --help
gluon-vue-analyze --version
```

- `root` defaults to the current working directory and must resolve to one
  readable directory.
- `--format` defaults to `human`.
- Both report formats are written to stdout. The analyzer creates no report
  file and writes no repository file.
- Invocation and fatal I/O messages are written to stderr.
- Human output contains no color or terminal-width-dependent wrapping.
- There is no analyzer config file, environment-variable configuration,
  ignore-file evaluation, plugin loading, or network option in schema version 1.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Analysis completed and the report contains no `error` finding. `info` and `warning` findings may exist. |
| `1` | Analysis completed and the report contains at least one `error` finding, including unsupported or malformed analyzed input. |
| `2` | Invocation, root resolution, permissions, or fatal report serialization failed before a valid report could be produced. |
| `3` | A fixed file, byte, entry, AST, depth, worker-memory, or worker-time resource budget was exceeded. A deterministic limit report is emitted when serialization remains possible. |

No other public exit code is permitted in schema version 1.

## Supported project input

Support means the analyzer has a defined static inventory and diagnostic
behavior. It does not mean that Gluon reproduces the construct's semantics.

### Project discovery

The analyzer accepts a local directory with:

- one UTF-8 `package.json` JSON object;
- Vue declared in `dependencies`, `devDependencies`, or `peerDependencies`;
- an exact Vue version from an exact manifest declaration or npm
  `package-lock.json` version 2 or 3;
- Vue `>=3.5.0 <3.6.0`;
- zero or more `.vue` files below the root;
- JavaScript or TypeScript Vite configuration files named
  `vite.config.{js,ts,mjs,mts,cjs,cts}`;
- JavaScript or TypeScript source, test, and server entry files used only for
  import and call-site inventory.

Directories named `.git`, `node_modules`, `dist`, `coverage`, `.nuxt`, and
`.output` are always excluded. Directory entries and files are visited in
normalized relative-path order. Symbolic links are recorded but never
followed. Paths are emitted relative to the real analysis root with `/`
separators; absolute host paths never enter a report.

Vue 2, Vue versions outside the declared range, an unresolved Vue version,
Yarn or pnpm lock data used as the only exact version source, Vue CLI, webpack,
Nuxt, and other meta-framework project contracts are unsupported in schema
version 1. The analyzer continues over readable files where safe and emits an
explicit error finding; it does not reinterpret them as Vue 3.5 Vite input.

### Single-File Components

Supported SFC block structure is:

- at most one `<template>` block with no `src` or `lang` attribute;
- at most one ordinary `<script>` and at most one `<script setup>` block;
- script language absent, `js`, or `ts`;
- zero or more `<style>` blocks with language absent or `css`;
- UTF-8 text without external `src` blocks.

The analyzer supports these script modes for inventory:

1. `<script setup>` JavaScript or TypeScript with static imports and direct
   calls to `defineProps`, `defineEmits`, `defineModel`, `defineOptions`, Vue
   reactivity functions, Vue lifecycle functions, Router helpers, and Store
   helpers;
2. an ordinary script whose default export is an object literal or a direct
   `defineComponent()` call with an object literal, including statically named
   `name`, `components`, `props`, `emits`, `setup`, `data`, `computed`,
   `methods`, `watch`, and lifecycle keys;
3. a valid combination of ordinary module script plus `<script setup>`.

Static identifiers, object keys, string literals, import sources, and direct
call names are inventory evidence. Computed keys, spreads whose target is not a
local static object, aliases that cannot be resolved within the file, arbitrary
control flow, returned closures, and values produced by executing code are
indeterminate. JavaScript decorators, JSX/TSX, external scripts, compiler
plugins, custom macros, and runtime component registration are unsupported.

### Template constructs

The analyzer inventories:

- native and component element names;
- static attributes and component prop names;
- `v-bind` / `:`, `v-on` / `@`, `v-model`, `v-slot` / `#`, `v-if`,
  `v-else-if`, `v-else`, `v-for`, `v-show`, `v-html`, `v-text`, `v-once`,
  `v-memo`, and `v-pre`;
- static directive arguments and modifiers;
- static and dynamic slot declarations and uses;
- `<component>`, `<Teleport>`, `<KeepAlive>`, `<Suspense>`, and async component
  references;
- interpolation and directive expression source locations without evaluating
  their expressions.

A static construct receives exact or structural confidence. Dynamic directive
arguments, dynamic component selection, non-local template expression
dependencies, custom directives, deprecated Vue 2 syntax, parser recovery, and
unknown compiler nodes produce indeterminate or unsupported findings. The
analyzer never guesses the resulting DOM, value, or control flow.

### Router, Store, async, styles, SSR, tests, and build

Static import sources and direct call names provide inventory for:

- `vue-router`, route configuration, Router view/link usage, guards, and
  navigation calls;
- `pinia` and `vuex`, store definitions, store access, and mapping helpers;
- async components, Vue `<Suspense>`, dynamic imports, and loader-like calls;
- Vue scoped styles, CSS modules, ordinary CSS blocks, style count, and style
  attributes;
- `createSSRApp`, `@vue/server-renderer`, recognizable server/client entry
  filenames, and hydration calls;
- `*.test.*` and `*.spec.*` files plus imports from Vue test libraries and test
  runners;
- Vite config imports and direct `@vitejs/plugin-vue` setup.

These integrations are always structural or indeterminate migration evidence,
never exact Gluon behavioral mappings. Scoped styles and CSS modules are
supported as inventory but require review. Non-CSS preprocessors and external
style sources are unsupported. Config files are parsed as text/AST only and are
never imported.

## Explicitly unsupported input behavior

The following always produces a named diagnostic rather than a guessed mapping:

- unsupported or unresolved Vue versions;
- invalid JSON, invalid UTF-8, malformed SFC blocks, or parser failures;
- external `src` blocks, template preprocessors, CSS preprocessors, JSX/TSX,
  custom blocks, custom compiler macros, and custom directives;
- dynamic directive arguments, dynamic component identity, unresolved object
  spreads, computed registration names, and runtime-generated route/store data;
- Vue 2 filters, instance APIs, and deprecated template syntax;
- Nuxt conventions, Vue CLI/webpack plugin execution, Vite plugin execution,
  or framework-specific config evaluation;
- semantic claims about Router guards, Store actions, async cancellation,
  scoped selector rewriting, SSR output, hydration identity, or tests;
- code outside the analysis root or beyond a fixed resource budget.

An unsupported project may still receive a partial inventory. Partial output
must carry an error finding and set `summary.supportState` to `partial` or
`unsupported`, never `supported`.

## Report schema

The canonical JSON Schema version is `1.0.0`. The package ships it as
`schemas/vue-migration-report.schema.json` and exports the same frozen value
from `@gluonjs/vue-migration-analyzer/schema`.

The top-level report fields are:

| Field | Contract |
| --- | --- |
| `schemaVersion` | Literal `"1.0.0"`. |
| `analyzer` | Package name and lockstep package version only. |
| `root` | Literal `"."`; no absolute source root. |
| `input` | Declared/resolved Vue version evidence, discovered package manager evidence, fixed limits, files visited, files analyzed, and bytes read. |
| `files` | Stable file ID, normalized path, kind, byte count, SHA-256 digest, and parse status. No source text. |
| `components` | Stable component ID, SFC modes/blocks, inventory IDs, finding IDs, and migration-stage IDs. |
| `inventory` | Stable, categorized static evidence for all supported source, SFC, test, server, and build files. |
| `findings` | Stable finding identity, code, severity, confidence, message, source location when available, migration stage, and guide URL. |
| `summary` | Counts by file kind, inventory category, severity, confidence, stage, and support state. |

Arrays are sorted by path, start offset, diagnostic code, and stable ID. Object
keys are serialized in schema order. Reports contain no timestamp, duration,
hostname, username, current working directory, absolute path, random value,
ANSI escape, locale-formatted value, or source excerpt. Repeated analysis of
unchanged input with the same analyzer version and limits must produce
byte-identical JSON and human output.

The following TypeScript shape is normative. The JSON Schema applies the same
required fields, enum values, bounds, and `additionalProperties: false` at every
object boundary:

```ts
type Severity = 'info' | 'warning' | 'error';
type Confidence = 'exact' | 'structural' | 'indeterminate';
type SupportState = 'supported' | 'partial' | 'unsupported';
type MigrationStage =
  | 'baseline'
  | 'leaf-boundary'
  | 'state-form'
  | 'route-state-async'
  | 'styles-universal'
  | 'shell-removal';
type FileKind =
  | 'manifest'
  | 'lockfile'
  | 'sfc'
  | 'source'
  | 'test'
  | 'server'
  | 'build-config'
  | 'symlink'
  | 'other';
type ParseStatus = 'parsed' | 'skipped' | 'malformed' | 'unsupported' | 'limited';
type ScriptMode = 'none' | 'setup' | 'options' | 'setup-and-options';
type BlockKind = 'template' | 'script' | 'script-setup' | 'style' | 'custom';
type InventoryCategory =
  | 'component'
  | 'prop-event-model'
  | 'slot-directive-ref'
  | 'reactivity-lifecycle'
  | 'router'
  | 'store'
  | 'async'
  | 'style'
  | 'ssr-hydration'
  | 'test'
  | 'build'
  | 'remaining-vue';
type InventoryKind =
  | 'component-element'
  | 'native-element'
  | 'prop'
  | 'emit'
  | 'model'
  | 'slot-declaration'
  | 'slot-use'
  | 'directive'
  | 'ref'
  | 'reactive-primitive'
  | 'lifecycle'
  | 'router-import'
  | 'router-call'
  | 'store-import'
  | 'store-call'
  | 'async-component'
  | 'suspense'
  | 'teleport'
  | 'keep-alive'
  | 'style-block'
  | 'ssr-call'
  | 'hydration-call'
  | 'test-file'
  | 'test-import'
  | 'build-config'
  | 'build-plugin'
  | 'vue-import'
  | 'vue-dependency';

interface SourcePoint {
  readonly line: number; // integer >= 1
  readonly column: number; // integer >= 1
}

interface SourceLocation {
  readonly fileId: string;
  readonly startOffset: number; // integer >= 0
  readonly endOffset: number; // integer >= startOffset
  readonly start: SourcePoint;
  readonly end: SourcePoint;
}

interface AnalyzedFile {
  readonly id: string;
  readonly path: string;
  readonly kind: FileKind;
  readonly bytes: number;
  readonly digest: `sha256:${string}`;
  readonly parseStatus: ParseStatus;
}

interface SfcBlock {
  readonly kind: BlockKind;
  readonly lang: string | null;
  readonly scoped: boolean;
  readonly module: string | null;
  readonly location: SourceLocation;
}

interface ComponentInventory {
  readonly id: string;
  readonly fileId: string;
  readonly scriptMode: ScriptMode;
  readonly blocks: readonly SfcBlock[];
  readonly inventoryIds: readonly string[];
  readonly findingIds: readonly string[];
  readonly migrationStages: readonly MigrationStage[];
}

interface InventoryItem {
  readonly id: string;
  readonly fileId: string;
  readonly componentId: string | null;
  readonly category: InventoryCategory;
  readonly kind: InventoryKind;
  readonly name: string | null;
  readonly importSource: string | null;
  readonly confidence: Confidence;
  readonly location: SourceLocation;
  readonly migrationStage: MigrationStage;
  readonly guideUrl: string;
}

interface MigrationFinding {
  readonly id: string;
  readonly code: `GVA${number}`;
  readonly severity: Severity;
  readonly confidence: Confidence;
  readonly message: string;
  readonly location: SourceLocation | null;
  readonly migrationStage: MigrationStage;
  readonly relatedStages: readonly MigrationStage[];
  readonly guideUrl: string;
}

interface VueMigrationReport {
  readonly schemaVersion: '1.0.0';
  readonly analyzer: Readonly<{
    name: '@gluonjs/vue-migration-analyzer';
    version: string;
  }>;
  readonly root: '.';
  readonly input: Readonly<{
    vue: Readonly<{
      declaredRange: string | null;
      resolvedVersion: string | null;
      versionSource:
        | 'exact-manifest'
        | 'package-lock-v2'
        | 'package-lock-v3'
        | 'unresolved';
    }>;
    packageManager: Readonly<{
      kind: 'npm' | 'yarn' | 'pnpm' | 'other' | 'none';
      lockfile: string | null;
    }>;
    limits: Readonly<{
      directoryEntries: 10000;
      analyzedFiles: 2000;
      bytesPerFile: 2097152;
      aggregateBytes: 67108864;
      astNodesPerFile: 250000;
      nesting: 256;
      workerMemoryMiB: 256;
      millisecondsPerFile: 5000;
      millisecondsPerInvocation: 30000;
    }>;
    entriesVisited: number;
    filesVisited: number;
    filesAnalyzed: number;
    bytesRead: number;
  }>;
  readonly files: readonly AnalyzedFile[];
  readonly components: readonly ComponentInventory[];
  readonly inventory: readonly InventoryItem[];
  readonly findings: readonly MigrationFinding[];
  readonly summary: Readonly<{
    supportState: SupportState;
    files: number;
    components: number;
    fileKinds: Readonly<Record<FileKind, number>>;
    inventory: Readonly<Record<InventoryCategory, number>>;
    severities: Readonly<Record<Severity, number>>;
    confidences: Readonly<Record<Confidence, number>>;
    stages: Readonly<Record<MigrationStage, number>>;
  }>;
}
```

Inventory ID is
`inventory:<kind>:<normalized-relative-path>:<start-offset>:<end-offset>:<ordinal>`.
It follows the same deterministic ordinal rule as findings. `name` contains
only a declared identifier, static element/directive/slot name, or direct call
name. `importSource` contains only a static import specifier. A dynamic value
uses `null` plus indeterminate confidence and a finding; raw expression text is
never copied.

`digest` is the SHA-256 of the exact file bytes. A skipped symbolic-link record
uses zero bytes and the SHA-256 of the empty byte sequence; the link target is
not emitted.

### Stable identities

- File ID: `file:<normalized-relative-path>`.
- Component ID: `component:<normalized-relative-path>`.
- Finding ID:
  `finding:<code>:<normalized-relative-path>:<start-offset>:<end-offset>:<ordinal>`.
- The ordinal starts at one only when the same code and range occur more than
  once, after deterministic sorting.
- Diagnostic codes are never repurposed for another meaning.

Renaming a file intentionally changes file, component, and finding IDs. A
source edit before a finding intentionally changes its range-based ID.

### Source locations

- `startOffset` and `endOffset` are zero-based UTF-16 code-unit offsets into the
  original decoded file; the end is exclusive.
- `start.line`, `start.column`, `end.line`, and `end.column` are one-based; the
  end is exclusive.
- CRLF counts as one line break while offsets still count both code units.
- A file-wide finding uses offsets `0` through the original decoded length.
- A project-wide finding omits `location` and names `package.json` or the root
  in its message without inventing a position.
- Parser recovery locations are reported only when supplied against the
  original source. Generated or transformed offsets are prohibited.

### Severity and confidence

Severity is independent from confidence:

| Value | Meaning |
| --- | --- |
| `info` | Supported inventory that does not itself block the current stage. |
| `warning` | Review is required, but the recognized input is supported inventory. |
| `error` | Input is unsupported, malformed, unsafe, outside limits, or prevents a complete supported report. |

| Confidence | Meaning |
| --- | --- |
| `exact` | Direct static syntax establishes the recorded fact without evaluating code. |
| `structural` | A recognized syntax/import pattern exists, but migration semantics require human review. |
| `indeterminate` | Static inspection cannot establish the value or behavior. No mapping is asserted. |

Confidence is an enum, not a probability. Numeric confidence scores are
prohibited because the fixture corpus does not establish calibrated
probabilities.

## Diagnostic contract

Schema version 1 reserves these stable diagnostic families:

| Code | Default severity | Meaning | Stage |
| --- | --- | --- | --- |
| `GVA1001` | `error` | Vue version is unsupported. | `baseline` |
| `GVA1002` | `error` | Exact Vue version cannot be established. | `baseline` |
| `GVA1003` | `warning` | Project or lockfile form is recognized but unsupported. | `baseline` |
| `GVA1101` | `error` | SFC block or script language/mode is unsupported. | `leaf-boundary` |
| `GVA1102` | `error` | External or custom SFC block is unsupported. | `leaf-boundary` |
| `GVA1103` | `error` | SFC, script, template, style, or JSON input is malformed. | `baseline` |
| `GVA1201` | `warning` | Dynamic construct is indeterminate. | Nearest owning stage |
| `GVA1202` | `error` | Custom or unknown directive/macro is unsupported. | `leaf-boundary` |
| `GVA1203` | `warning` | Runtime registration or render-function behavior requires review. | `leaf-boundary` |
| `GVA1301` | `warning` | Router evidence requires route-owner redesign. | `route-state-async` |
| `GVA1302` | `warning` | Pinia/Vuex evidence requires application/request Store redesign. | `route-state-async` |
| `GVA1303` | `warning` | Async evidence requires cancellation and teardown redesign. | `route-state-async` |
| `GVA1401` | `warning` | Scoped-style behavior requires constructed-sheet review. | `styles-universal` |
| `GVA1402` | `warning` | CSS module behavior requires constructed-sheet review. | `styles-universal` |
| `GVA1403` | `error` | Style language or external style source is unsupported. | `styles-universal` |
| `GVA1501` | `warning` | SSR or hydration evidence requires single-renderer ownership review. | `styles-universal` |
| `GVA1601` | `warning` | Test or build evidence requires a replacement/retention plan. | `shell-removal` |
| `GVA9001` | `error` | A parser failed without a more specific supported recovery. | `baseline` |
| `GVA9002` | `error` | A fixed resource budget was exceeded. | `baseline` |
| `GVA9003` | `error` | A path escaped the root or violated the path contract. | `baseline` |
| `GVA9004` | `error` | A file became unreadable or changed identity during analysis. | `baseline` |

Implementation may add codes only within these meanings and the SemVer policy
below. Each human finding includes its code, severity, confidence, relative
path/location, message, migration stage, and versioned guide link.

## Migration-stage links

Reports use these stable stage IDs and version-matched documentation anchors:

| Stage ID | Playbook stage | Findings |
| --- | --- | --- |
| `baseline` | Stage 0 | Project/version/build/test inventory, malformed input, and limits |
| `leaf-boundary` | Stage 1 | Components, props, emits, models, slots, directives, refs, and Custom Element transport |
| `state-form` | Stage 2 | Reactivity, form ownership, mutable state, and model ownership |
| `route-state-async` | Stage 3 | Router, Pinia/Vuex, cross-route state, async work, and cancellation |
| `styles-universal` | Stage 4 | Styles, SSR, request state, hydration, and renderer ownership |
| `shell-removal` | Stage 5 | Tests, build configuration, remaining Vue imports, and dependency removal |

Guide URLs point to the matching heading in the versioned
`migration/vue-to-gluon-cutover/` page for the analyzer's lockstep version.
Findings may name more than one stage only when the report chooses one primary
stage and lists the remaining stages in deterministic order.

## Static inspection and execution prohibition

The analyzer must not:

- import, `require`, dynamically import, evaluate, transpile-and-run, or spawn
  any project source, package script, Vite/webpack/Vue/Nuxt configuration,
  plugin, loader, test, or dependency;
- invoke a package manager, build tool, compiler CLI, test runner, Git command,
  or application command;
- resolve code through `node_modules` execution or read dependency source for
  behavioral inference;
- access the network, DNS, sockets, telemetry, clipboard, keychain, browser,
  or environment secrets;
- write, rename, delete, chmod, format, patch, or touch source or config files;
- follow symbolic links or emit content outside stdout/stderr.

Reading bytes, parsing JSON, parsing supported source into inert AST data,
hashing bytes, and reading file metadata inside the root are the only allowed
project operations. Parser libraries run in an isolated worker with no project
module loader hook.

## Privacy and path contract

- Reports contain relative paths, declared symbol names needed for inventory,
  categories, locations, digests, and fixed messages only.
- Reports omit source excerpts, literal values unrelated to public declaration
  names, comments, environment variables, package script bodies, and absolute
  paths.
- Human and JSON outputs contain the same finding set.
- The tool has no telemetry or update check.
- The real root is captured once. Every candidate file is realpath-checked
  before read and must remain below that root.
- Symbolic links are not followed. A symlink that targets outside the root
  receives `GVA9003`; an internal symlink is recorded as skipped.
- NUL-containing paths and normalized relative paths longer than 1,024 UTF-16
  code units are rejected.
- Files that change size or identity between metadata check and read receive a
  deterministic I/O finding and are not reparsed.

## Fixed resource budgets

Schema version 1 uses fixed, non-configurable limits:

| Resource | Limit |
| --- | --- |
| Directory entries visited | 10,000 |
| Analyzable files | 2,000 |
| Bytes per file | 2 MiB |
| Aggregate bytes read | 64 MiB |
| AST nodes per file | 250,000 |
| Template / AST nesting | 256 |
| Parser worker memory | 256 MiB old-generation heap |
| Parser wall-clock deadline | 5 seconds per file and 30 seconds per invocation |

A budget failure emits `GVA9002`, stops scheduling new parser work, terminates
the worker, and exits `3`. Already completed findings remain sorted in the
partial report. A limit value cannot be raised by project configuration,
environment variables, or source directives. Changing a limit is a public
contract change documented under the SemVer policy.

## Malformed-input behavior

Malformed input never causes source execution or a successful supported report.
The analyzer:

1. records the smallest available original-source range;
2. emits `GVA1103` or, when the parser supplies no safe category, `GVA9001`;
3. continues with independent files while budgets permit;
4. does not use recovered AST nodes to assert exact mappings;
5. exits `1`, unless a fatal invocation error or resource limit requires `2`
   or `3`.

Unexpected internal failures are caught at the file boundary, emit no stack or
absolute path in stdout, and produce a deterministic fatal stderr message with
exit `2`. Debug stack output is not a public CLI mode in schema version 1.

## Fixture and retained-evidence contract

Issue #91 must retain source, expected JSON, expected human output, and expected
exit code for this corpus:

| Class | Required fixtures |
| --- | --- |
| Positive | The real `docs-site/examples/VueProductHost.vue`; a Vue 3.5 script-setup SFC; an Options API SFC; combined script/setup; typed props/emits/models; named/default/dynamic slots; native directives; form bindings; Router imports; Pinia and Vuex imports; async component/Suspense; ordinary/scoped/module CSS; SSR/client entries; test files; Vite Vue plugin config |
| Negative | Vue 2; Vue below/above the supported range; unresolved version; external SFC blocks; JSX/TSX; custom macro; custom directive; dynamic directive argument; dynamic component; runtime component registration; unresolved spread; Sass/Less; Nuxt; Vue CLI/webpack; arbitrary Router/Store generation |
| Malformed | Invalid package JSON; invalid UTF-8; unclosed/duplicate SFC blocks; broken script; broken template; broken CSS; parser recovery with original locations |
| Adversarial | Vite config, plugin, package script, test, and imported module that each write a sentinel if executed; symlink escape; path traversal name; oversized file; oversized project; excessive AST nodes/depth; parser-time and worker-memory exhaustion fixtures |

Every diagnostic code and every inventory category must have a positive or
negative fixture. Property/fuzz tests mutate UTF-8, delimiters, nesting,
attributes, directives, path forms, and ordering. Repeated and shuffled
filesystem discovery must produce byte-identical normalized reports.

The CI artifacts retained for #91 include:

- the versioned fixture manifest with SHA-256 input digests;
- expected and actual JSON reports validated against the shipped schema;
- expected and actual human reports;
- exit-code results;
- sentinel assertions proving no source/config/plugin execution;
- clean-install package, public type, CLI, and pack-content evidence.

Issue #92 may evaluate a source transformation only against this retained
corpus. Analyzer detection coverage is not behavioral equivalence, and no
result generalizes to arbitrary Vue projects.

## SemVer and support policy

The package version follows Gluon's lockstep train. The report schema has its
own `major.minor.patch` value:

- adding an optional field, inventory category, supported static construct, or
  new diagnostic code within an existing meaning increments schema minor;
- clarifying text or fixing an implementation without changing valid report
  instances increments schema patch;
- removing/renaming a field or enum value, changing identity/location rules,
  repurposing a code, changing exit-code meaning, or narrowing accepted report
  instances increments schema major and requires a Gluon major release after
  1.0;
- expanding supported Vue input may be a backward-compatible minor change;
  removing an accepted Vue version or syntax requires a major change after 1.0;
- fixed resource budgets may increase in a minor release but may decrease only
  in a major release, except for a documented security emergency.

Diagnostic codes are never reused. Deprecated codes remain documented through
the next stable minor before major removal. Human output is public CLI behavior
but not a machine parser contract; automation must use JSON.

## Documentation and release evidence

Issue #91 must add:

- package README, API and CLI reference, report-schema reference, diagnostic
  catalog entries, changelog entries, security notes, and quality-gate commands;
- a versioned analyzer guide linked from Migration and from every report stage;
- package-contract, clean-install, release-artifact, SBOM, and public type
  evidence;
- explicit language that the analyzer is report-only and does not establish a
  migration success claim.

The analyzer has no honest user-visible GLUON GOODS integration. It analyzes a
developer's source tree in Node and does not affect a customer browse,
configuration, bag, or checkout flow. Adding a shop control would be a
decorative tooling demo and would violate the living-shop contract. The shop
remains unchanged; `VueProductHost.vue` and the production configurator remain
the acceptance inputs that connect analyzer findings to customer behavior.

## Alternatives rejected

### Continue with documentation only

The playbook remains sufficient for manual work, but it cannot produce a
deterministic inventory of a project or retained findings for #92.

### Execute the Vue application and observe behavior

Execution would run untrusted application, config, plugin, loader, and package
code; results would depend on environment and exercised paths. This violates
the safety and determinism contract.

### Reuse the Gluon compiler package

`@gluonjs/compiler` owns Gluon tagged-template analysis and diagnostics. Making
it parse Vue SFCs would mix unrelated syntax and dependency ownership. The
analyzer therefore has no official package dependency.

### Emit a best-effort converted component

Unknown runtime, Router, Store, style, SSR, async, and plugin behavior prevents
a semantics-preserving whole-component conversion contract. Report-only
inventory is the accepted boundary.

### Add a writer behind an experimental flag

An experimental flag still writes source and would bypass the evidence and RFC
gate required by #92. No writer exists in this package contract.

## Acceptance checklist

- [x] The precise amendment to RFC 0001 is stated and Vue runtime/API compatibility remains out of scope.
- [x] Supported and unsupported Vue inputs are enumerated and unknown syntax has explicit diagnostics.
- [x] JSON/human output, stable identities, locations, exit codes, and SemVer are specified.
- [x] Application/config/plugin execution, network access, writes, unsafe paths, and unbounded resources are prohibited.
- [x] Positive, negative, malformed, adversarial, deterministic, and fuzz fixtures are required.
- [x] Findings link to the tested #88/#89 migration stages.
- [x] Package name, exports, CLI, dependency direction, docs, and release effects are decided.
- [x] The lack of an honest customer-visible shop integration is recorded.
- [x] A source writer remains prohibited without another accepted RFC.
