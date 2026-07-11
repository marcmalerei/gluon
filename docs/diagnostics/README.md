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
