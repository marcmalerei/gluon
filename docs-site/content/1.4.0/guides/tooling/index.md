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

The separate component-library reference includes a Storybook catalog built
from public package exports through `@gluonjs/gluon-components-vite`. Its
stories return native Gluon templates; the renderer owns Core rendering and
exact teardown. Four retained story states execute real interactions, run WCAG
A/AA analysis, and compare committed visual baselines:

```sh
npm run storybook:component-library
npm run check:storybook:component-library
```

The [Storybook guide](../../../../../docs/storybook.md) explains installation,
typed stories, component style dependencies, controls, and cleanup.

The production consumer and clean-install package checks remain the authority
for code splitting, loader cache, registration, stylesheet ownership, SSR,
hydration, and teardown behavior.

Open the [public Playground](/gluon/playground/) or browse the
[versioned diagnostic reference](/gluon/1.4.0/reference/diagnostics/).
