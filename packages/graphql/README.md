<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/graphql.png" alt="@gluonjs/graphql — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

# @gluonjs/graphql

`@gluonjs/graphql` is an optional, provider-agnostic data connector for Gluon.
It keeps resource state in an explicit request context so SSR prefetching,
component-owned loading, mixed rendering, and browser hydration can share one
deduplicated result without adding GraphQL or Contentful runtime code to Core.

The package ships as part of the current `1.12.3` release line.

<!-- gluon-package-overview:start -->
## @gluonjs/graphql at a glance

**Runtime:** universal · **Release:** 1.12.3

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/graphql/) · [npm](https://www.npmjs.com/package/@gluonjs/graphql) · [Source](https://github.com/marcmalerei/gluon/blob/main/packages/graphql/README.md)

**Public API:** [`@gluonjs/graphql`](https://marcmalerei.github.io/gluon/1.12.3/api/generated/packages/graphql/src/)

### Install

```sh
npm install @gluonjs/graphql
```

### Quick start

```ts
import { createGraphQLResource, createGraphQLResourceContext } from '@gluonjs/graphql';

const context = createGraphQLResourceContext();
const resource = createGraphQLResource<{ id: string }, { id: string }>({
  key: ({ id }) => `product:${id}`,
  query: 'query Product($id: ID!) { product(id: $id) { id } }',
  variables: ({ id }) => ({ id }),
  fetcher: async () => ({ id: '4711' }),
});

await resource.prefetch({ id: '4711' }, { context });
```

### Choose this package when

- Component-owned GraphQL resource reads with loading and error boundaries.
- SSR/page prefetch and request-local deduplication.
- Safe JSON state handoff for browser hydration.
- Contentful Delivery and Preview endpoint configuration without an SDK.

**Choose another boundary when:**

- Does not bundle a GraphQL client, schema generator, Contentful SDK, or renderer-specific Suspense wrapper.
- Callers must create one explicit context per SSR request and keep credentials server-side.

### Related documentation

- [GraphQL data connectors](https://marcmalerei.github.io/gluon/latest/guides/graphql-data-connectors/)
- [Universal rendering](https://marcmalerei.github.io/gluon/latest/guides/universal-rendering/)

<!-- gluon-package-overview:end -->

## Quick start

```ts
import {
  createFetchGraphQLFetcher,
  createGraphQLResource,
  createGraphQLResourceContext,
} from '@gluonjs/graphql';

type Product = { id: string; title: string };
const context = createGraphQLResourceContext();
const product = createGraphQLResource<{ id: string }, Product>({
  key: ({ id }) => `product:${id}`,
  query: 'query Product($id: ID!) { product(id: $id) { id title } }',
  variables: ({ id }) => ({ id }),
  fetcher: createFetchGraphQLFetcher({ endpoint: '/api/graphql' }),
});

await product.prefetch({ id: '4711' }, { context });
const value = product.peek({ id: '4711' }, context);
```

`read()` returns resolved data and throws the in-flight promise or deterministic
request error, which lets a surrounding async/Suspense boundary decide how to
render loading and error states. `prefetch()` and `read()` use the same cache
entry, so concurrent callers issue one upstream request. Create one context per
SSR request and hydrate it with `serializeGraphQLResourceState()` and
`hydrateGraphQLResourceState()`; never store a context in module-global state.

## Contentful reference

`createContentfulGraphQLFetcher()` configures the Contentful GraphQL endpoint,
environment, bearer token, preview variable, and locale variable without
depending on a Contentful SDK. Use generated query documents and generated
result types from the application's existing GraphQL code-generation workflow;
Gluon does not generate a second schema or type system.

```ts
import { createContentfulGraphQLFetcher } from '@gluonjs/graphql';

const fetcher = createContentfulGraphQLFetcher<Product, { id: string }>({
  space: process.env.CONTENTFUL_SPACE_ID!,
  environment: process.env.CONTENTFUL_ENVIRONMENT ?? 'master',
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN!,
  preview: false,
  locale: 'en-US',
});
```

Preview uses the same GraphQL endpoint with a preview token and the generated
query's `preview` variable. Keep all tokens on the server; browser hydration
receives only the serialized data snapshot. See the package guide for
component-owned loading, external data, SSR prefetch, mixed mode, hydration,
Contentful, and architecture trade-offs.

## Boundary

- No dependency on `@gluonjs/core`, GraphQL clients, or a Contentful SDK.
- The explicit `GraphQLResourceContext` is the request and application boundary.
- Serialization includes fulfilled JSON-compatible resource results only.
- Streaming/Suspense integration is provided by the caller's existing Gluon SSR
  boundary; this package does not replace the renderer or a GraphQL codegen tool.
