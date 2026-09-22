# Getting started

Gluon `1.12.0` supports Node `^22.12.0 || ^24.0.0`. Create a maintained
application from the public generator:

```sh
npm create gluon@latest my-app
cd my-app
npm install
npm run dev
```

Want to try the programming model first? Open the [shareable browser
Playground](/playground/). It provides starter code, diagnostics, and a stable
reproduction URL without requiring a local checkout. When the first experiment
is useful, move it into the generated application above.

## What to try first

The smallest useful path is deliberately short:

1. Render one `html` template with `@gluonjs/core`.
2. Add a reactive value with `@gluonjs/reactivity`.
3. Add Router, Store, UI, or SSR only when the application needs that boundary.

The [GLUON GOODS shop](https://github.com/marcmalerei/gluon/tree/main/examples/shop)
shows the same public packages joined into a complete customer flow. Use it to
understand how the individual guides compose, not as a prerequisite for a first
application.

New to frontend frameworks? Follow the
[step-by-step learning path](../learning-path/) next. It explains the generated
files, templates, bindings, reactivity, keyed lists, styles, cleanup, tests, and
the words used throughout the rest of the documentation.

To add the runtime to an existing project, install its public package entry
point:

```sh
npm install @gluonjs/core
```

Repository contributors use `npm ci --ignore-scripts`, install the required
Playwright browsers, and run `npm run check` from a clean checkout.

## First application

Create an `#app` mount container, then use the public Core and Reactivity entry
points:

<<< ../../../../examples/basic-app.ts

Gluon updates the existing template parts when `count.value` changes. The
application owns its render effect and releases it during unmount.

## Production check

`npm run check` typechecks public API fixtures, runs Node and browser tests,
builds client/server/static outputs, validates package archives, compiles every
maintained starter, and builds this documentation site.

## Package chooser

| Goal | Start with |
| --- | --- |
| Render templates or create an application/Custom Element | `@gluonjs/core` |
| Add reactive values and derived state | `@gluonjs/reactivity` |
| Use native/headless building blocks | `@gluonjs/quarks` |
| Use optional reusable UI | `@gluonjs/atoms`, `@gluonjs/molecules`, `@gluonjs/organisms` |
| Add URLs | `@gluonjs/router` |
| Add shared application state | `@gluonjs/store` |
| Build with Vite and `.gluon` files | [`@gluonjs/vite`](../sfc-authoring/) |
| Build a Storybook catalog | `@gluonjs/gluon-components-vite` |
| Test public browser behavior | `@gluonjs/test-utils` |
| Render on a server or generate static HTML | `@gluonjs/ssr` |

Install a package when the feature enters the application. A minimal browser
app does not need Router, Store, SSR, or the optional UI packages.

If the first run does not behave as expected, [open a small issue with a
Playground link](https://github.com/marcmalerei/gluon/issues/new/choose). This
keeps feedback attached to a reproducible example and helps improve the starter
path for the next user.
