# Diagnostic reference

The versioned machine-readable Gluon diagnostic catalog is generated from the
public `@gluonjs/compiler/diagnostics` entry point. Version `0.0.0` is available
as [`0.0.0.json`](./0.0.0.json) and through the searchable Config state in the
Gluon Playground.

Every entry has a stable full code, compact production code, title, summary,
cause, remediation, and owning subsystem. `npm run check:diagnostics` scans
public source for `GLUON_*` codes, accounts for the generated hydration family,
including the browser Playground, requires catalog coverage, and compares the
committed versioned JSON byte for byte with the built public package.

## Vue migration analyzer diagnostics

The separate Node-only `@gluonjs/vue-migration-analyzer` package owns `GVA`
codes. They are report-schema diagnostics rather than Core runtime/compiler
diagnostics and therefore do not enter the Playground catalog above. RFC 0003
defines the stable families `GVA1001`–`GVA1601` and `GVA9001`–`GVA9004` for
unsupported versions/project forms, SFC/script/template/style input, dynamic
constructs, Router/Store/async/style/SSR/test/build review, parser failures,
resource budgets, root/path escapes, and changing inputs.

Every analyzer finding contains its code, severity, confidence, relative source
location when available, cutover stage, and versioned guide URL. JSON output
validates against
`packages/vue-migration-analyzer/schemas/vue-migration-report.schema.json`;
retained fixture reports and exit codes are checked by
`npm run check:vue-analyzer-fixtures`.
