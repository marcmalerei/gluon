# Cookbook

Every TypeScript recipe below is sourced from a file compiled by
`npm run typecheck:docs`.

## Choose a recipe by workflow

| Workflow | Packages working together | Runnable example | Ownership boundary |
| --- | --- | --- | --- |
| Application navigation and state | Core + Router + Store | [Router and Store recipe](#compose-router-and-store-ownership) | Router owns URLs and history; the application-scoped Store manager owns state. |
| Universal request rendering | Core + Router + Store + SSR | [Server rendering recipe](#render-on-the-server) | Each request gets isolated application, Router, Store, and cleanup. |
| Layered interface | Core + Quarks + Atoms + Molecules + Organisms | [Component composition](#compose-atom-molecule-and-organism-boundaries) and [full UI host](/gluon/1.12.0/examples/ui.html) | The app composes only the UI layers it uses and owns the exact styles. |
| Schema-driven preferences | Core + JSON Forms | [Form source on GitHub](https://github.com/marcmalerei/gluon/blob/main/docs-site/examples/json-forms.ts) and [runnable form](/gluon/1.12.0/examples/json-forms.html) | The element renders and validates; the host owns persistence and submission policy. |
| Relationship visualization | Graph + application-owned controls | [Runnable knowledge graph](/gluon/1.12.0/examples/graph.html) | The graph owns drawing and selection; the host owns filtering and domain state. |
| Public browser tests | Core + Test Utils + Vitest | [Browser test recipe](#test-through-public-utilities) | Tests observe rendered public behavior, not private renderer internals. |
| Existing Vue application | Vue host + Gluon Custom Element | [Vue host recipe](#host-a-gluon-element-from-vue) and [runnable host](/gluon/1.12.0/examples/vue.html) | Vue owns the host page; Gluon owns its Custom Element and component lifecycle. |

Use the package pages to check peers and runtimes before composing a flow. The
[GLUON GOODS shop](https://github.com/marcmalerei/gluon/tree/main/examples/shop)
is the maintained whole-application reference when a capability has a real
customer workflow.

## Mount a reactive browser application

<<< ../../../examples/basic-app.ts

## Build a searchable keyed list with owned styles

<<< ../../../examples/beginner-feature.ts

## Compose Atom, Molecule, and Organism boundaries

<<< ../../../examples/component-decisions.ts

## Publish a Custom Element

<<< ../../../examples/custom-element.ts

## Compose Router and Store ownership

<<< ../../../examples/router-store.ts

## Render on the server

<<< ../../../examples/universal-rendering.ts

## Test through public utilities

<<< ../../../examples/testing.ts

## Host a Gluon element from Vue

The host treats the Gluon component as a standards-based Custom Element. It
passes the production product and configuration as properties, supplies native
slots, and observes `configuration-change` and `add-to-bag`; it does not
translate the Gluon component into a Vue component.

<<< ../../../examples/vue-host.ts

Run the compiled [plain HTML host](/gluon/1.12.0/examples/plain.html) or the
[Vue host](/gluon/1.12.0/examples/vue.html).
