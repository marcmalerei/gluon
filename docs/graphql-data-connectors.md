# GraphQL resources and SSR data connectors

`@gluonjs/graphql` is an optional package. It is deliberately outside
`@gluonjs/core`, has no GraphQL client dependency, and accepts typed generated
documents/results from the application's existing GraphQL code-generation
workflow.

## One resource, two loading owners

Create one resource definition and pass an explicit context from the owning
application or SSR request:

```ts
import {
  createFetchGraphQLFetcher,
  createGraphQLResource,
  createGraphQLResourceContext,
} from '@gluonjs/graphql';

type Product = { id: string; title: string };
type ProductReference = { id: string };

const productResource = createGraphQLResource<ProductReference, Product>({
  key: ({ id }) => `product:${id}`,
  query: 'query Product($id: ID!) { product(id: $id) { id title } }',
  variables: ({ id }) => ({ id }),
  fetcher: createFetchGraphQLFetcher({ endpoint: 'https://example.test/graphql' }),
});

// The same context can be passed to a component-owned loader or page code.
const context = createGraphQLResourceContext();
await productResource.prefetch({ id: '4711' }, { context });
const product = productResource.peek({ id: '4711' }, context);
```

`read()` is intended for an async/Suspense-aware component boundary:

```ts
function readProduct(id: string, context: GraphQLResourceContext) {
  try {
    return productResource.read({ id }, { context });
  } catch (value) {
    if (value instanceof Promise) return { status: 'loading' as const };
    return { status: 'error' as const, error: value };
  }
}
```

`prefetch()` and `read()` share the key and promise. Five components asking for
`product:4711` in one context therefore make one upstream request. A rejected
request is removed so a later call can retry; `invalidate()` also removes a
fulfilled entry.

## A — Component-owned fetch

The component receives a stable reference and owns the lookup, while the page
owns the context. The component contract does not change when the page later
starts prefetching:

```ts
class ProductCard {
  constructor(
    readonly contentId: string,
    readonly resourceContext: GraphQLResourceContext,
  ) {}

  render() {
    return readProduct(this.contentId, this.resourceContext);
  }
}
```

On the browser, keep the context with the application lifecycle. On SSR, create
one context per request and pass it through the render tree.

## B — External/page-owned data

Page code can resolve data first and pass the result to a presentational
component. No resource lookup is required in that component:

```ts
const context = createGraphQLResourceContext();
const product = await productResource.prefetch({ id: '4711' }, { context });
renderProductCard({ product });
```

This is useful when a route loader already owns data dependencies or when a
component should remain purely presentational.

## C — SSR prefetch and reuse

```ts
async function renderRequest() {
  const context = createGraphQLResourceContext();
  await productResource.prefetch({ id: '4711' }, { context });

  // A nested component resolves synchronously from the same context.
  const product = productResource.read({ id: '4711' }, { context });
  const html = renderProductCard({ product });

  return {
    html,
    state: serializeGraphQLResourceState(context),
  };
}
```

The page prefetch and nested component use the same key. No second request is
issued.

## D — Mixed mode

Prefetch only the data needed to establish the page shell. Nested components
can discover other resources during rendering using the same context:

```ts
const context = createGraphQLResourceContext();
await productResource.prefetch({ id: '4711' }, { context });

// Product is a cache hit; recommendations may start a component-owned load.
const product = productResource.read({ id: '4711' }, { context });
const recommendations = recommendationsResource.read({ id: '4711' }, { context });
```

The surrounding Gluon SSR async boundary can await the promise thrown by the
second `read()` and render the resolved tree. The connector does not replace
Gluon's renderer or force all data dependencies into page code.

## E — Hydration handoff

```ts
// Server
const serverContext = createGraphQLResourceContext();
await productResource.prefetch({ id: '4711' }, { context: serverContext });
const state = serializeGraphQLResourceState(serverContext);

// Browser, after receiving the HTML and safe state script
const browserContext = createGraphQLResourceContext({ initialState: state });
const product = productResource.read({ id: '4711' }, { context: browserContext });
```

Only fulfilled, JSON-compatible results are serialized. Keep access tokens and
request headers server-side. The browser lookup is a cache hit and does not
repeat the server request.

## F — Contentful and generated types

Contentful's GraphQL endpoint is configured without a provider SDK:

```ts
import {
  createContentfulGraphQLFetcher,
  createGraphQLResource,
} from '@gluonjs/graphql';
import { ProductDocument } from './generated/graphql.js';
import type { ProductQuery, ProductQueryVariables } from './generated/graphql.js';

const productResource = createGraphQLResource<
  ProductQueryVariables,
  ProductQuery['product']
>({
  key: ({ id }) => `contentful:product:${id}`,
  query: ProductDocument,
  variables: (reference) => reference,
  fetcher: createContentfulGraphQLFetcher({
    space: process.env.CONTENTFUL_SPACE_ID!,
    environment: process.env.CONTENTFUL_ENVIRONMENT ?? 'master',
    accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN!,
    preview: false,
    locale: 'en-US',
  }),
});
```

Generated documents may be strings or expose `loc.source.body`, as common
typed-document outputs do. The adapter sends `preview` and `locale` as default
variables; a generated query should declare and use those variables. For the
Delivery API use a delivery token and `preview: false`; for draft content use a
preview token and `preview: true`. Environment IDs are explicit. Keep the
fetcher on the server when credentials must remain private.

See the official [Contentful GraphQL overview](https://www.contentful.com/developers/docs/references/graphql/overview/)
and [locale handling](https://www.contentful.com/developers/docs/references/graphql/locale-handling/)
for endpoint, preview, environment, and locale semantics.

## G — Choosing a loading model

| Model | Choose it when | Trade-off |
| --- | --- | --- |
| Component-owned | A component has a stable ID and should be reusable in different pages. | Data dependencies are discovered deeper in the tree. |
| External/page-owned | A route or page already coordinates all data. | Components need a supplied data prop or view model. |
| SSR prefetch | First HTML should include known above-the-fold data. | The request boundary must pass the resource context through the render tree. |
| Mixed mode | A page knows some dependencies but nested components discover others. | The SSR async boundary must coordinate both prefetches and thrown `read()` promises. |

Use one explicit context per SSR request and one application-owned context in the
browser. Never share a context between requests. `AbortSignal` from either the
context or an individual operation cancels in-flight work; `timeoutMs` adds a
deterministic timeout to a resource definition.

## Current slice and remaining issue work

This initial slice delivers the provider-agnostic resource contract, request
deduplication, SSR prefetch/reuse, JSON state handoff, cancellation, timeout,
Contentful endpoint configuration, and documentation for all loading models.
It intentionally does not implement a GraphQL schema/code generator, a
Contentful SDK, a renderer-specific Suspense wrapper, or streaming transport.
Those remain application/provider or follow-up integration work.
