# Signals interoperability example

This executable example proves the optional TC39 and Preact Signals adapters
against their real packages. Both external graphs drive a customer-shaped lamp
quantity and total through Gluon's renderer. Buttons update each source graph;
unmounting the Gluon application disconnects both subscriptions.

```sh
npm install
npm run dev:signals-example
```

Open the printed Vite URL. `npm run build:signals-example` produces the
production build, and `tests/signals-example.spec.ts` verifies both controls.
