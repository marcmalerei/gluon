import {
  containReactivityError,
  reportReactivityError,
  type ReactivityErrorHandler,
} from './error.js';

export interface EffectScopeOptions {
  readonly detached?: boolean;
  readonly onError?: ReactivityErrorHandler;
}

/** @internal */
export interface ScopedEffect {
  stop(fromScope?: boolean): void;
}

interface ScopeCleanup {
  readonly callback: () => void;
}

let activeScope: EffectScope | undefined;

export class EffectScope {
  private readonly effects: ScopedEffect[] = [];
  private readonly childScopes: EffectScope[] = [];
  private readonly cleanups: ScopeCleanup[] = [];
  private parent: EffectScope | undefined;
  private stopped = false;
  readonly onError: ReactivityErrorHandler | undefined;

  constructor(options: EffectScopeOptions = {}) {
    this.onError = options.onError;
    const requestedParent = options.detached ? undefined : activeScope;
    this.parent = requestedParent?.active ? requestedParent : undefined;
    if (requestedParent && !requestedParent.active) this.stopped = true;
    this.parent?.childScopes.push(this);
  }

  get active(): boolean {
    return !this.stopped;
  }

  run<T>(callback: () => T): T | undefined {
    if (this.stopped) return undefined;
    const previous = activeScope;
    activeScope = this;
    try {
      return callback();
    } finally {
      activeScope = previous;
    }
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;

    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      this.effects[index]?.stop(true);
    }
    for (let index = this.childScopes.length - 1; index >= 0; index -= 1) {
      this.childScopes[index]?.stop();
    }
    for (let index = this.cleanups.length - 1; index >= 0; index -= 1) {
      try {
        containReactivityError(
          this.cleanups[index]?.callback(),
          'cleanup',
          this,
          this.onError,
        );
      } catch (error) {
        reportReactivityError(error, 'cleanup', this, this.onError);
      }
    }

    this.effects.length = 0;
    this.childScopes.length = 0;
    this.cleanups.length = 0;
    const parentIndex = this.parent?.childScopes.indexOf(this) ?? -1;
    if (parentIndex >= 0) this.parent?.childScopes.splice(parentIndex, 1);
    this.parent = undefined;
  }

  /** @internal */
  recordEffect(effect: ScopedEffect): void {
    if (this.stopped) effect.stop(true);
    else this.effects.push(effect);
  }

  /** @internal */
  removeEffect(effect: ScopedEffect): void {
    const index = this.effects.indexOf(effect);
    if (index >= 0) this.effects.splice(index, 1);
  }

  /** @internal */
  recordCleanup(cleanup: () => void): (() => void) | undefined {
    if (this.stopped) return undefined;
    const entry = { callback: cleanup } satisfies ScopeCleanup;
    this.cleanups.push(entry);
    return () => {
      const index = this.cleanups.indexOf(entry);
      if (index >= 0) this.cleanups.splice(index, 1);
    };
  }
}

export function effectScope(options?: boolean | EffectScopeOptions): EffectScope {
  return new EffectScope(
    typeof options === 'boolean' ? { detached: options } : options,
  );
}

export function getCurrentScope(): EffectScope | undefined {
  return activeScope;
}

export function onScopeDispose(cleanup: () => void): boolean {
  return recordScopeCleanup(cleanup) !== undefined;
}

/** @internal */
export function recordScopeCleanup(cleanup: () => void): (() => void) | undefined {
  return activeScope?.recordCleanup(cleanup);
}

/** @internal */
export function recordEffectScope(effect: ScopedEffect): (() => void) | undefined {
  const scope = activeScope;
  if (!scope) return undefined;
  scope.recordEffect(effect);
  if (!scope.active) return undefined;
  return () => scope.removeEffect(effect);
}
