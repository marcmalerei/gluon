import { directive } from './runtime.js';

export const semanticAnalyticsEvents = Object.freeze([
  'view_item_list',
  'select_item',
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'purchase',
] as const);

export type SemanticAnalyticsEvent = typeof semanticAnalyticsEvents[number];
export type AnalyticsEventName = SemanticAnalyticsEvent | (string & {});

export interface AnalyticsEvent<Payload = unknown> {
  readonly name: AnalyticsEventName;
  readonly payload: Payload;
  readonly context: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
}

export interface AnalyticsAdapter {
  readonly id: string;
  send(event: AnalyticsEvent): void | PromiseLike<void>;
}

export interface AnalyticsEventOptions {
  readonly context?: Readonly<Record<string, unknown>>;
  readonly dedupeKey?: string;
}

export interface AnalyticsOptions {
  readonly adapters?: readonly AnalyticsAdapter[];
  readonly consent?: () => boolean | 'granted' | 'denied';
  readonly enrich?: (event: AnalyticsEvent) => Readonly<Record<string, unknown>>;
  readonly environment?: 'browser' | 'server';
  readonly now?: () => number;
  readonly debug?: (event: AnalyticsEvent) => void;
}

export interface AnalyticsScope {
  readonly context: Readonly<Record<string, unknown>>;
  child(context: Readonly<Record<string, unknown>>): AnalyticsScope;
  track<Payload>(name: AnalyticsEventName, payload: Payload, options?: AnalyticsEventOptions): AnalyticsEvent<Payload> | undefined;
  impression<Payload>(key: string, name: AnalyticsEventName, payload: Payload, options?: Omit<AnalyticsEventOptions, 'dedupeKey'>): AnalyticsEvent<Payload> | undefined;
}

export interface AnalyticsDirectiveOptions {
  readonly emitOnUpdate?: boolean;
}

/**
 * Provider-independent analytics owned by an application. Server instances
 * intentionally accept events but never deliver them to adapters.
 */
export class Analytics {
  private readonly delivered = new Set<string>();
  private readonly options: AnalyticsOptions;

  constructor(options: AnalyticsOptions = {}) {
    this.options = options;
  }

  scope(context: Readonly<Record<string, unknown>> = {}): AnalyticsScope {
    return createScope(this, Object.freeze({ ...context }));
  }

  withContext<Result>(context: Readonly<Record<string, unknown>>, callback: (scope: AnalyticsScope) => Result): Result {
    return callback(this.scope(context));
  }

  /** Emits an event to every configured adapter when consent is available. */
  dispatch<Payload>(
    name: AnalyticsEventName,
    payload: Payload,
    context: Readonly<Record<string, unknown>> = {},
    options: Pick<AnalyticsEventOptions, 'dedupeKey'> = {},
  ): AnalyticsEvent<Payload> | undefined {
    if (this.options.environment === 'server') return undefined;
    const consent = this.options.consent?.();
    if (consent === false || consent === 'denied') return undefined;
    if (options.dedupeKey && this.delivered.has(options.dedupeKey)) return undefined;

    const event: AnalyticsEvent<Payload> = Object.freeze({
      name,
      payload,
      context: Object.freeze({ ...context }),
      timestamp: this.options.now?.() ?? Date.now(),
    });
    const enriched = this.options.enrich?.(event);
    const delivered = enriched
      ? Object.freeze({ ...event, context: Object.freeze({ ...event.context, ...enriched }) })
      : event;
    if (options.dedupeKey) this.delivered.add(options.dedupeKey);
    this.options.debug?.(delivered);
    for (const adapter of this.options.adapters ?? []) {
      try {
        const result = adapter.send(delivered);
        if (result && typeof result === 'object' && 'then' in result) {
          void Promise.resolve(result).catch((error) => {
            this.options.debug?.(Object.freeze({
              name: 'analytics_adapter_error',
              payload: { adapter: adapter.id, error },
              context: delivered.context,
              timestamp: delivered.timestamp,
            }));
          });
        }
      } catch (error) {
        this.options.debug?.(Object.freeze({
          name: 'analytics_adapter_error',
          payload: { adapter: adapter.id, error },
          context: delivered.context,
          timestamp: delivered.timestamp,
        }));
      }
    }
    return delivered as AnalyticsEvent<Payload>;
  }

  clearImpressions(): void {
    this.delivered.clear();
  }
}

export function createAnalytics(options: AnalyticsOptions = {}): Analytics {
  return new Analytics(options);
}

export function createServerAnalytics(options: Omit<AnalyticsOptions, 'environment'> = {}): Analytics {
  return new Analytics({ ...options, environment: 'server' });
}

export function createGa4Adapter(
  send: (event: Readonly<Record<string, unknown>>) => void | PromiseLike<void>,
): AnalyticsAdapter {
  return {
    id: 'ga4',
    send(event) {
      const payload = event.payload && typeof event.payload === 'object'
        ? event.payload as Readonly<Record<string, unknown>>
        : { value: event.payload };
      return send({ event: event.name, ...payload, ...event.context });
    },
  };
}

function createScope(analytics: Analytics, context: Readonly<Record<string, unknown>>): AnalyticsScope {
  const scope: AnalyticsScope = {
    context,
    child(childContext: Readonly<Record<string, unknown>>) {
      return createScope(analytics, Object.freeze({ ...context, ...childContext }));
    },
    track<Payload>(name: AnalyticsEventName, payload: Payload, options: AnalyticsEventOptions = {}) {
      return analytics.dispatch(name, payload, { ...context, ...options.context }, options);
    },
    impression<Payload>(key: string, name: AnalyticsEventName, payload: Payload, options: Omit<AnalyticsEventOptions, 'dedupeKey'> = {}) {
      return analytics.dispatch(name, payload, { ...context, ...options.context }, { ...options, dedupeKey: key });
    },
  };
  return Object.freeze(scope);
}

/** Emits a semantic event from a template lifecycle without coupling components to a vendor. */
export const trackEvent = directive<[
  AnalyticsScope,
  AnalyticsEventName,
  unknown,
  AnalyticsEventOptions | undefined,
  AnalyticsDirectiveOptions | undefined,
]>(
  {
    mount(_part, args) { args[0].track(args[1], args[2], args[3]); },
    update(_part, args, previousArgs) {
      if (args[4]?.emitOnUpdate) args[0].track(args[1], args[2], args[3]);
      else if (args[0] !== previousArgs[0] || args[1] !== previousArgs[1]) args[0].track(args[1], args[2], args[3]);
    },
  },
);

/** Emits a once-per-analytics-instance impression from a template lifecycle. */
export const trackImpression = directive<[
  AnalyticsScope,
  string,
  AnalyticsEventName,
  unknown,
  Omit<AnalyticsEventOptions, 'dedupeKey'> | undefined,
]>(
  {
    mount(_part, args) { args[0].impression(args[1], args[2], args[3], args[4]); },
    update() {},
  },
);
