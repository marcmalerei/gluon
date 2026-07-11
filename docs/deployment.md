# Static and server deployment

The production GLUON GOODS build proves both deployment modes with the same
public application modules.

```sh
npm run build
```

The client build emits hashed browser assets plus `gluon-assets.json`. The
manifest names the module entry, modulepreload dependencies, CSS assets, and
other referenced assets. The server build emits the DOM-independent request
renderer. The static build consumes both outputs and writes route directories
under `examples/shop/dist-static`.

## Static mode

`generateStaticSite()` accepts explicit public URLs, an asset manifest, and the
same `renderShopRequest()` used for dynamic requests. GLUON GOODS prerenders
home, catalog, Orbit Lamp, shipping, and returns. `gluon-static.json` records
those pages and `/products/:slug`, `/checkout`, and `/orders/:id` as dynamic
stateful fallbacks. Hosts serve generated
`index.html` files at their recorded URLs and immutable hashed `/assets/` files.

Generated documents contain resource hints, the module entry, SSR state, and
hydration markers. No component or route implementation is forked for SSG.

## Server mode

Deploy `examples/shop/dist-server/server.js` on a supported Node runtime and
call `renderShopRequest(requestUrl, { assets, nonce })` per request. Read the
immutable client manifest once at startup. Insert `result.head` in the document
head, `result.html` in `#app`, and `result.stateScript` after the root. For a CSP
nonce policy, pass the request-specific nonce and emit the matching header;
Gluon never generates nonces.

The request renderer owns and disposes its Router, Store, application, and
effect scope. Dynamic routes may coexist with generated paths as recorded in
`gluon-static.json`.

## Initial styles and hydration

`result.head` places ordered `style[data-gluon-style]` carriers before app
markup. Each contains its content-addressed ID and digest. Hydration validates
carrier count, ID, digest, CSS text, and order before mutation. It constructs
the sheets, preserves unrelated adopted sheets, adopts the validated set,
hydrates DOM, then removes carriers. Failure restores the prior adopted list
and retains carriers, reporting `GLUON_UNSUPPORTED_SSR_TRANSPORT`.

## Verification

- `npm run check` builds client, server, and static outputs.
- `tests-node/compiler-vite.spec.ts` verifies the asset manifest.
- `tests-node/ssr.spec.ts` verifies routes, hints, carriers, nonce transport, and
  mixed static/dynamic output.
- `tests/hydration.spec.ts` verifies carrier removal, adopted-sheet ownership,
  and failure retention.
