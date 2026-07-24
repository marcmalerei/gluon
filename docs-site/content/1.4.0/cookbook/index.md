# Cookbook

Every TypeScript recipe below is sourced from a file compiled by
`npm run typecheck:docs`.

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

Run the compiled [plain HTML host](/gluon/1.4.0/examples/plain.html) or the
[Vue host](/gluon/1.4.0/examples/vue.html).
