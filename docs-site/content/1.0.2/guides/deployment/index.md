# Deployment

GLUON GOODS is the canonical deployment fixture. Build its client, server, and
static outputs from the repository root:

```sh
npm run build:shop
npm run build:shop:server
npm run build:shop:static
```

The client output contains hashed assets and `gluon-assets.json`. The server
bundle exposes the isolated request renderer. The static output contains five
prerendered routes and a manifest that records dynamic product, checkout, and
order fallbacks.

## Static hosts

Serve generated route `index.html` files at their recorded URLs and immutable
assets from `/assets/`. A host using web-history routes must provide the
document fallback described by the Router contract.

## Node servers

Load `examples/shop/dist-server/server.js`, read the immutable client manifest
once, and call `renderShopRequest(requestUrl, { assets, nonce })` for each
request. Gluon accepts a request nonce but never creates one.

The repository [deployment contract](/gluon/1.0.2/reference/deployment/) names
the exact output, style-carrier, CSP, and verification behavior.
