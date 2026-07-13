# Gluon Playground

The Playground is the maintained browser reproduction surface. It imports the
same public Core, Reactivity, Compiler diagnostic catalog, Language Server, and
Vite package entry points used by local starters. Application source never
imports repository internals; monorepo aliases live only in Vite/test config.

```sh
npm run dev:playground
npm run build:playground
```

The default reproduction defines and renders a stateful Custom Element with the
public `defineGluonElement` and `elementEvent` APIs. Re-running edited source
reuses the registered example tag while the preview continues to receive typed
property and native event bindings.

The App and Styles tabs edit a typed two-file reproduction. Run transpiles the
TypeScript modules, executes imports from the supported public `@gluonjs/core`
and `@gluonjs/reactivity` entry points, renders the exported default, `App`,
`Counter`, or first function through Gluon, adopts exported constructable
stylesheets in the preview ShadowRoot, and calls the shared Language Server
analyzer. Compile, import, and render failures remain visible instead of
producing a successful run status. Share encodes
both files into a URL-safe `#p=` payload, so reload and copying retain the exact
reproduction. Download creates an uncompressed, runnable Vite project with an
HTML entry, typed Gluon mount, constructable stylesheet adoption, TypeScript
configuration, aligned `1.0.6` Gluon dependencies, and the template checker.
The default project also exercises `compose(Component, props)\`body\`` so the
browser analyzer and downloaded project retain template-native functional
composition at original TypeScript locations.

The Playground intentionally has no visual UI-package application for
component-owned sheets: its host chrome uses native controls styled by the
Playground's app-owned constructable sheet, while executable reproductions and
downloaded archives support only the public `@gluonjs/core` and
`@gluonjs/reactivity` runtime imports. The retained archive test asserts that
dependency boundary. Consequently the Playground neither imports an aggregate
Atom/Molecule/Organism sheet nor manufactures a UI component example solely for
style coverage; UI component lifecycle evidence remains in GLUON GOODS and the
cross-engine component-style suite.

The GitHub Pages job starts from `npm ci --ignore-scripts`, builds Core (including
Reactivity), Compiler, and Vite in dependency order, and then builds the
Playground and versioned documentation. It typechecks every documentation
example and validates the release tree before publishing both outputs as one
Pages artifact. This matches a clean runner where package `dist` directories do
not exist before the workflow starts. The checkout, Node setup, Pages
configuration, artifact upload, and deployment steps use their current Node 24
action majors.

Config opens the searchable versioned diagnostic catalog. Diagnostic rows link
directly into that state. The GitHub Pages workflow deploys the production build
at `https://marcmalerei.github.io/gluon/playground/`; the bug-report template
requires a shared Playground URL. The documentation root is
`https://marcmalerei.github.io/gluon/`; the Playground remains at
`https://marcmalerei.github.io/gluon/playground/`.

Design references are in `design/`. The application uses true white, near-black
chrome, cobalt selection and diagnostics, chartreuse primary actions, thin
rules, constructable stylesheets, keyboard-operable native controls, and a
mobile single-column workbench.
