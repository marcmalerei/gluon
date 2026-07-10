export type ReactivityErrorPhase = 'effect' | 'scheduler' | 'cleanup' | 'error-handler';

export interface ReactivityErrorContext {
  readonly error: unknown;
  readonly phase: ReactivityErrorPhase;
  readonly source?: unknown;
}

export type ReactivityErrorHandler = (
  context: ReactivityErrorContext,
) => void | PromiseLike<void>;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  ) && typeof Reflect.get(value, 'then') === 'function';
}

function defaultErrorHandler(context: ReactivityErrorContext): void {
  const environment = globalThis as {
    reportError?: (error: unknown) => void;
    console?: { error?: (...values: unknown[]) => void };
  };

  try {
    if (typeof environment.reportError === 'function') {
      environment.reportError(context.error);
      return;
    }
    environment.console?.error?.(context.error);
  } catch {
    // The error channel must not turn scheduler failures into rejected flush promises.
  }
}

let globalErrorHandler: ReactivityErrorHandler = defaultErrorHandler;

export function setReactivityErrorHandler(
  handler: ReactivityErrorHandler | undefined,
): () => void {
  const previous = globalErrorHandler;
  globalErrorHandler = handler ?? defaultErrorHandler;
  return () => {
    globalErrorHandler = previous;
  };
}

export function reportReactivityError(
  error: unknown,
  phase: ReactivityErrorPhase,
  source?: unknown,
  handler?: ReactivityErrorHandler,
): void {
  const context = { error, phase, source } satisfies ReactivityErrorContext;
  try {
    const result = (handler ?? globalErrorHandler)(context);
    if (isPromiseLike(result)) {
      void Promise.resolve(result).catch((handlerError: unknown) => {
        defaultErrorHandler({
          error: handlerError,
          phase: 'error-handler',
          source: context,
        });
      });
    }
  } catch (handlerError) {
    defaultErrorHandler({
      error: handlerError,
      phase: 'error-handler',
      source: context,
    });
  }
}

/** @internal */
export function containReactivityError(
  value: unknown,
  phase: ReactivityErrorPhase,
  source?: unknown,
  handler?: ReactivityErrorHandler,
): unknown {
  if (!isPromiseLike(value)) return value;
  return Promise.resolve(value).catch((error: unknown) => {
    reportReactivityError(error, phase, source, handler);
    return undefined;
  });
}
