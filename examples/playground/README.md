# Gluon Playground

The Playground is the maintained browser reproduction surface. It imports the
same public Core, Reactivity, Compiler diagnostic catalog, Language Server, and
Vite package entry points used by local starters. Application source never
imports repository internals; monorepo aliases live only in Vite/test config.

```sh
npm run dev:playground
npm run build:playground
```

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
configuration, aligned `0.0.0` Gluon dependencies, and the template checker.

The GitHub Pages job starts from `npm ci --ignore-scripts`, builds Core (including
Reactivity), Compiler, and Vite in dependency order, and then runs
`npm run build:playground`. This matches a clean runner where package `dist`
directories do not exist before the workflow starts.

Config opens the searchable versioned diagnostic catalog. Diagnostic rows link
directly into that state. The GitHub Pages workflow deploys the production build
at `https://marcmalerei.github.io/gluon/playground/`; the bug-report template
requires a shared Playground URL.

Design references are in `design/`. The application uses true white, near-black
chrome, cobalt selection and diagnostics, chartreuse primary actions, thin
rules, constructable stylesheets, keyboard-operable native controls, and a
mobile single-column workbench.
