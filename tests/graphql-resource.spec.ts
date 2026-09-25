import { describe, expect, it } from 'vitest';
import {
  GraphQLRequestError,
  GraphQLTimeoutError,
  createContentfulGraphQLFetcher,
  createGraphQLResource,
  createGraphQLResourceContext,
  serializeGraphQLResourceState,
} from '../packages/graphql/src/index.js';

describe('request-scoped GraphQL resources', () => {
  it('deduplicates concurrent prefetch and lets read reuse the result', async () => {
    let calls = 0;
    let resolveRequest!: (value: { id: string }) => void;
    const request = new Promise<{ id: string }>((resolve) => { resolveRequest = resolve; });
    const resource = createGraphQLResource<{ id: string }, { id: string }>({
      key: ({ id }) => `product:${id}`,
      query: 'query Product($id: ID!) { product(id: $id) { id } }',
      variables: ({ id }) => ({ id }),
      fetcher: async () => {
        calls += 1;
        return request;
      },
    });
    const context = createGraphQLResourceContext();
    const first = resource.prefetch({ id: '4711' }, { context });
    const second = resource.prefetch({ id: '4711' }, { context });
    expect(calls).toBe(0);
    await Promise.resolve();
    expect(calls).toBe(1);
    resolveRequest({ id: '4711' });
    await expect(Promise.all([first, second])).resolves.toEqual([{ id: '4711' }, { id: '4711' }]);
    expect(resource.read({ id: '4711' }, { context })).toEqual({ id: '4711' });
    expect(resource.peek({ id: '4711' }, context)).toEqual({ id: '4711' });
  });

  it('throws the shared pending promise and preserves request isolation through hydration', async () => {
    const resource = createGraphQLResource<{ id: string }, { id: string }>({
      key: ({ id }) => `product:${id}`,
      query: 'query Product($id: ID!) { product(id: $id) { id } }',
      variables: ({ id }) => ({ id }),
      fetcher: async ({ variables }) => variables,
    });
    const server = createGraphQLResourceContext();
    const pending = resource.prefetch({ id: '4711' }, { context: server });
    expect(() => resource.read({ id: '4711' }, { context: server })).toThrow(pending);
    await pending;

    const state = serializeGraphQLResourceState(server);
    const browser = createGraphQLResourceContext({ initialState: state });
    expect(resource.peek({ id: '4711' }, browser)).toEqual({ id: '4711' });
    expect(resource.peek({ id: '4711' }, createGraphQLResourceContext())).toBeUndefined();
  });

  it('propagates abort and timeout without retaining failed entries', async () => {
    const abortController = new AbortController();
    const resource = createGraphQLResource<{ id: string }, { id: string }>({
      key: ({ id }) => `product:${id}`,
      query: 'query Product { product { id } }',
      variables: () => ({}),
      timeoutMs: 5,
      fetcher: ({ signal }) => new Promise((_, reject) => {
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    });
    const context = createGraphQLResourceContext({ signal: abortController.signal });
    const promise = resource.prefetch({ id: '4711' }, { context });
    abortController.abort(new Error('request closed'));
    await expect(promise).rejects.toThrow('request closed');
    expect(resource.peek({ id: '4711' }, context)).toBeUndefined();

    const timeoutContext = createGraphQLResourceContext();
    await expect(resource.prefetch({ id: '4711' }, { context: timeoutContext })).rejects.toBeInstanceOf(GraphQLTimeoutError);
    expect(resource.peek({ id: '4711' }, timeoutContext)).toBeUndefined();
  });

  it('normalizes GraphQL errors and configures Contentful variables without exposing credentials', async () => {
    const contentfulRequests: RequestInit[] = [];
    const fetcher = createContentfulGraphQLFetcher<{ product: { id: string } }, { id: string }>({
      space: 'space id',
      environment: 'preview-env',
      accessToken: 'server-secret',
      preview: true,
      locale: 'de-DE',
      fetch: async (input, init) => {
        expect(input).toBe('https://graphql.contentful.com/content/v1/spaces/space%20id/environments/preview-env');
        contentfulRequests.push(init ?? {});
        return new Response(JSON.stringify({ data: { product: { id: '4711' } } }), { status: 200 });
      },
    });
    const result = await fetcher({
      document: 'query Product($id: ID!, $preview: Boolean, $locale: String) { product { id } }',
      query: 'query Product($id: ID!, $preview: Boolean, $locale: String) { product { id } }',
      variables: { id: '4711' },
      signal: new AbortController().signal,
    });
    expect(result).toEqual({ data: { product: { id: '4711' } } });
    const body = JSON.parse(String(contentfulRequests[0]?.body));
    expect(body.variables).toEqual({ id: '4711', preview: true, locale: 'de-DE' });
    expect(contentfulRequests[0]?.headers).toMatchObject({ authorization: 'Bearer server-secret' });

    const errorResource = createGraphQLResource<{ id: string }, { id: string }>({
      key: ({ id }) => id,
      query: 'query Product { product { id } }',
      variables: () => ({}),
      fetcher: async () => ({ errors: [{ message: 'not found' }] }),
    });
    await expect(errorResource.prefetch({ id: 'missing' }, { context: createGraphQLResourceContext() }))
      .rejects.toBeInstanceOf(GraphQLRequestError);
  });
});
