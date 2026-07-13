# Getting started

Gluon `1.0.6` supports Node `^22.12.0 || ^24.0.0`. Create a maintained
application from the public generator:

```sh
npm create gluon@latest my-app
cd my-app
npm install
npm run dev
```

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
