export type GraphQLVariables = Readonly<Record<string, unknown>>;

export type GraphQLDocument =
  | string
  | Readonly<{ query: string }>
  | Readonly<{
    loc?: Readonly<{ source?: Readonly<{ body?: string }> }>;
  }>;

export interface GraphQLErrorLike {
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface GraphQLResponse<TData> {
  readonly data?: TData;
  readonly errors?: readonly GraphQLErrorLike[];
}

export interface GraphQLFetchRequest<TVariables = GraphQLVariables> {
  readonly document: GraphQLDocument;
  readonly query: string;
  readonly variables: TVariables;
  readonly signal: AbortSignal;
}

export type GraphQLFetcher<TData, TVariables = GraphQLVariables> = (
  request: GraphQLFetchRequest<TVariables>,
) => Promise<TData | GraphQLResponse<TData>>;

export interface GraphQLResourceContext {
  readonly signal?: AbortSignal;
  readonly cache: Map<string, unknown>;
}

export interface GraphQLResourceContextOptions {
  readonly signal?: AbortSignal;
  readonly initialState?: GraphQLResourceSnapshot | string;
}

export interface GraphQLResourceSnapshotEntry {
  readonly key: string;
  readonly data: unknown;
}

export interface GraphQLResourceSnapshot {
  readonly version: 1;
  readonly resources: readonly GraphQLResourceSnapshotEntry[];
}

export interface GraphQLRequestOptions {
  readonly context: GraphQLResourceContext;
  readonly signal?: AbortSignal;
}

export interface GraphQLResourceOptions<
  TReference,
  TData,
  TVariables = GraphQLVariables,
> {
  readonly key: (reference: TReference) => string;
  readonly query: GraphQLDocument;
  readonly variables: (reference: TReference) => TVariables;
  readonly fetcher: GraphQLFetcher<TData, TVariables>;
  readonly timeoutMs?: number;
}

export interface GraphQLResource<TReference, TData> {
  read(reference: TReference, options: GraphQLRequestOptions): TData;
  prefetch(reference: TReference, options: GraphQLRequestOptions): Promise<TData>;
  peek(reference: TReference, context: GraphQLResourceContext): TData | undefined;
  invalidate(reference: TReference, context: GraphQLResourceContext): void;
}

export class GraphQLRequestError extends Error {
  readonly code: 'GRAPHQL_HTTP_ERROR' | 'GRAPHQL_RESPONSE_ERROR' | 'GRAPHQL_EMPTY_RESPONSE';
  readonly status?: number;
  readonly errors?: readonly GraphQLErrorLike[];

  constructor(
    message: string,
    options: {
      readonly code: GraphQLRequestError['code'];
      readonly status?: number;
      readonly errors?: readonly GraphQLErrorLike[];
    },
  ) {
    super(message);
    this.name = 'GraphQLRequestError';
    this.code = options.code;
    this.status = options.status;
    this.errors = options.errors;
  }
}

export class GraphQLTimeoutError extends Error {
  readonly code = 'GRAPHQL_TIMEOUT' as const;

  constructor(timeoutMs: number) {
    super(`GraphQL request exceeded the ${timeoutMs}ms timeout.`);
    this.name = 'GraphQLTimeoutError';
  }
}

export function createGraphQLResourceContext(options: GraphQLResourceContextOptions = {}): GraphQLResourceContext {
  const context: GraphQLResourceContext = {
    signal: options.signal,
    cache: new Map(),
  };
  if (options.initialState) hydrateGraphQLResourceState(context, options.initialState);
  return context;
}

export function createGraphQLResource<
  TReference,
  TData,
  TVariables = GraphQLVariables,
>(options: GraphQLResourceOptions<TReference, TData, TVariables>): GraphQLResource<TReference, TData> {
  return {
    read(reference, requestOptions) {
      const record = ensureRecord(reference, requestOptions);
      if (record.status === 'fulfilled') return record.data as TData;
      if (record.status === 'rejected') throw record.error;
      throw record.promise;
    },
    prefetch(reference, requestOptions) {
      const record = ensureRecord(reference, requestOptions);
      if (record.status === 'fulfilled') return Promise.resolve(record.data as TData);
      if (record.status === 'rejected') return Promise.reject(record.error);
      return record.promise as Promise<TData>;
    },
    peek(reference, context) {
      const record = context.cache.get(options.key(reference));
      return isFulfilled(record) ? record.data as TData : undefined;
    },
    invalidate(reference, context) {
      const key = options.key(reference);
      const record = context.cache.get(key);
      if (isPending(record)) record.controller.abort('GraphQL resource invalidated.');
      context.cache.delete(key);
    },
  };

  function ensureRecord(
    reference: TReference,
    requestOptions: GraphQLRequestOptions,
  ): ResourceRecord {
    const key = options.key(reference);
    const existing = requestOptions.context.cache.get(key);
    if (existing) return existing as ResourceRecord;

    const controller = new AbortController();
    const cleanups = [
      forwardAbort(requestOptions.context.signal, controller),
      forwardAbort(requestOptions.signal, controller),
    ];
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const record: PendingResourceRecord = {
      status: 'pending',
      controller,
      promise: Promise.resolve().then(async () => {
        if (options.timeoutMs !== undefined) {
          timeout = setTimeout(() => controller.abort(new GraphQLTimeoutError(options.timeoutMs!)), options.timeoutMs);
        }
        const result = await options.fetcher({
          document: options.query,
          query: printGraphQLDocument(options.query),
          variables: options.variables(reference),
          signal: controller.signal,
        });
        if (result && typeof result === 'object' && 'errors' in result && Array.isArray(result.errors) && result.errors.length > 0) {
          throw new GraphQLRequestError(
            result.errors.map((error) => error.message).join('; '),
            { code: 'GRAPHQL_RESPONSE_ERROR', errors: result.errors },
          );
        }
        if (result && typeof result === 'object' && 'data' in result) {
          if (result.data === undefined) {
            throw new GraphQLRequestError('GraphQL response did not contain data.', { code: 'GRAPHQL_EMPTY_RESPONSE' });
          }
          return result.data;
        }
        return result;
      }).then((data) => {
        record.status = 'fulfilled';
        record.data = data;
        return data;
      }).catch((error: unknown) => {
        record.status = 'rejected';
        record.error = normalizeAbortError(error, controller.signal);
        if (requestOptions.context.cache.get(key) === record) requestOptions.context.cache.delete(key);
        throw record.error;
      }).finally(() => {
        if (timeout) clearTimeout(timeout);
        for (const cleanup of cleanups) cleanup();
      }),
    };
    requestOptions.context.cache.set(key, record);
    return record;
  }
}

export function serializeGraphQLResourceState(context: GraphQLResourceContext): string {
  return JSON.stringify(snapshotGraphQLResourceState(context));
}

export function snapshotGraphQLResourceState(context: GraphQLResourceContext): GraphQLResourceSnapshot {
  const resources: GraphQLResourceSnapshotEntry[] = [];
  for (const [key, value] of context.cache) {
    if (isFulfilled(value)) resources.push({ key, data: value.data });
  }
  return { version: 1, resources };
}

export function hydrateGraphQLResourceState(
  context: GraphQLResourceContext,
  state: GraphQLResourceSnapshot | string,
): void {
  const snapshot = typeof state === 'string' ? parseGraphQLResourceState(state) : state;
  if (snapshot.version !== 1) throw new Error(`Unsupported GraphQL resource snapshot version: ${snapshot.version}.`);
  for (const entry of snapshot.resources) {
    context.cache.set(entry.key, { status: 'fulfilled', data: entry.data });
  }
}

export function parseGraphQLResourceState(raw: string): GraphQLResourceSnapshot {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 1
    || !Array.isArray((parsed as { resources?: unknown }).resources)) {
    throw new Error('Invalid GraphQL resource snapshot.');
  }
  return parsed as GraphQLResourceSnapshot;
}

export interface FetchGraphQLFetcherOptions {
  readonly endpoint: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly fetch?: typeof globalThis.fetch;
}

export function createFetchGraphQLFetcher<TData, TVariables = GraphQLVariables>(
  options: FetchGraphQLFetcherOptions,
): GraphQLFetcher<TData, TVariables> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) throw new Error('A fetch implementation is required to create a GraphQL fetcher.');
  return async ({ query, variables, signal }) => {
    const response = await fetchImplementation(options.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...options.headers },
      body: JSON.stringify({ query, variables }),
      signal,
    });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GraphQLRequestError(`GraphQL endpoint returned invalid JSON (HTTP ${response.status}).`, {
        code: 'GRAPHQL_HTTP_ERROR',
        status: response.status,
      });
    }
    if (!response.ok) {
      throw new GraphQLRequestError(`GraphQL endpoint returned HTTP ${response.status}.`, {
        code: 'GRAPHQL_HTTP_ERROR',
        status: response.status,
      });
    }
    return payload as GraphQLResponse<TData>;
  };
}

export interface ContentfulGraphQLFetcherOptions {
  readonly space: string;
  readonly environment?: string;
  readonly accessToken: string;
  readonly preview?: boolean;
  readonly locale?: string;
  readonly endpoint?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly fetch?: typeof globalThis.fetch;
}

export function createContentfulGraphQLFetcher<
  TData,
  TVariables = GraphQLVariables,
>(options: ContentfulGraphQLFetcherOptions): GraphQLFetcher<TData, TVariables> {
  const baseEndpoint = options.endpoint ?? 'https://graphql.contentful.com';
  const environment = options.environment ?? 'master';
  const endpoint = `${baseEndpoint.replace(/\/$/, '')}/content/v1/spaces/${encodeURIComponent(options.space)}/environments/${encodeURIComponent(environment)}`;
  const fetcher = createFetchGraphQLFetcher<TData, TVariables>({
    endpoint,
    fetch: options.fetch,
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      ...options.headers,
    },
  });
  return (request) => {
    const variables = {
      ...request.variables,
      ...(options.preview === undefined ? {} : { preview: options.preview }),
      ...(options.locale === undefined ? {} : { locale: options.locale }),
    } as TVariables;
    return fetcher({ ...request, variables });
  };
}

function printGraphQLDocument(document: GraphQLDocument): string {
  if (typeof document === 'string') return document;
  if ('query' in document && typeof document.query === 'string') return document.query;
  const body = 'loc' in document ? document.loc?.source?.body : undefined;
  if (typeof body === 'string') return body;
  throw new Error('GraphQL documents must be strings or expose loc.source.body (as generated documents do).');
}

type PendingResourceRecord = {
  status: 'pending' | 'fulfilled' | 'rejected';
  readonly controller: AbortController;
  readonly promise: Promise<unknown>;
  data?: unknown;
  error?: unknown;
};

type ResourceRecord = PendingResourceRecord | { status: 'fulfilled'; data: unknown } | { status: 'rejected'; error: unknown };

function isPending(value: unknown): value is PendingResourceRecord {
  return Boolean(value && typeof value === 'object' && (value as { status?: unknown }).status === 'pending');
}

function isFulfilled(value: unknown): value is { status: 'fulfilled'; data: unknown } {
  return Boolean(value && typeof value === 'object' && (value as { status?: unknown }).status === 'fulfilled');
}

function forwardAbort(signal: AbortSignal | undefined, controller: AbortController): () => void {
  if (!signal) return () => {};
  const onAbort = () => controller.abort(signal.reason);
  if (signal.aborted) controller.abort(signal.reason);
  else signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
}

function normalizeAbortError(error: unknown, signal: AbortSignal): unknown {
  if (!signal.aborted) return error;
  return signal.reason ?? error;
}
