# Getting started

Gluon is currently a private `0.0.0` repository build. Registry installation is
not claimed. From a clean checkout, use Node 22.12 or Node 24:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run build
npm run check
```

After public release, the maintained generator command is:

```sh
npm create gluon@latest my-app
```

Until publication, run `npm run build:create-gluon` and invoke
`node packages/create-gluon/dist/cli.js my-app` from this repository.

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
