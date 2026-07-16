# Signals interoperability example

This executable example proves the optional TC39 and Preact Signals adapters
against their real packages. Both external graphs drive a customer-shaped lamp
quantity and total through Gluon's renderer. Buttons update each source graph;
unmounting the Gluon application disconnects both subscriptions.

```sh
npm install
npm run dev:signals-example
npm run build:signals-example
npm run preview:signals-example
```

Open the printed Vite URL. The production preview uses
`http://127.0.0.1:4176/gluon/examples/signals/`, and
`tests/signals-example.spec.ts` verifies both controls.
