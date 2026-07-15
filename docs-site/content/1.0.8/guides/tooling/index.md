# Tooling workflow

Gluon uses one public workflow from project creation through production builds.

## Author and diagnose

- `@gluonjs/vite` adds source maps, template diagnostics, and compatible HMR.
- `gluon-template-check src` runs the same analyzer used by the Language Server.
- The VS Code client starts the lockstep language server.
- The Playground preserves a reproduction in a stable `#p=` URL and downloads a runnable starter.

## Inspect and test

Devtools is opt-in and disabled in production builds. `@gluonjs/test-utils`
mounts public components and applications in real browsers and exposes cleanup
and leak diagnostics without renderer internals.

<<< ../../../../examples/testing.ts

Open the [public Playground](/gluon/playground/) or browse the
[versioned diagnostic reference](/gluon/1.0.8/reference/diagnostics/).
