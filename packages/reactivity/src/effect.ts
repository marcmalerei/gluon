export type TrackOperation = 'get' | 'has' | 'iterate';
export type TriggerOperation = 'set' | 'add' | 'delete' | 'clear';

export type ReactiveEffectRunner<T = unknown> = () => T;

export interface EffectDebuggerEvent {
  readonly effect: ReactiveEffectRunner;
  readonly target: object;
  readonly type: TrackOperation | TriggerOperation;
  readonly key?: unknown;
  readonly newValue?: unknown;
  readonly oldValue?: unknown;
}

export interface EffectOptions {
  readonly onTrack?: (event: EffectDebuggerEvent) => void;
  readonly onTrigger?: (event: EffectDebuggerEvent) => void;
  readonly onStop?: () => void;
}

type Dependency = Set<ReactiveEffect>;
type Scheduler = () => void;

export const ITERATE_KEY = Symbol('gluon iterate');
export const MAP_KEY_ITERATE_KEY = Symbol('gluon map key iterate');
export const ARRAY_ITERATE_KEY = Symbol('gluon array iterate');
export const COLLECTION_SIZE_KEY = Symbol('gluon collection size');

const targetDependencies = new WeakMap<object, Map<unknown, Dependency>>();
const hasDependencyKeys = new WeakMap<object, Map<unknown, symbol>>();
const runnerEffects = new WeakMap<ReactiveEffectRunner, ReactiveEffect>();
const effectStack: ReactiveEffect[] = [];
const trackingStack: boolean[] = [];
let activeEffect: ReactiveEffect | undefined;
let trackingEnabled = true;

function isDevelopment(): boolean {
  return (
    globalThis as { process?: { env?: { NODE_ENV?: string } } }
  ).process?.env?.NODE_ENV !== 'production';
}

class ReactiveEffect {
  readonly dependencies = new Set<Dependency>();
  active = true;
  runner!: ReactiveEffectRunner;
  private lastValue: unknown;

  constructor(
    private readonly callback: () => unknown,
    readonly scheduler?: Scheduler,
    readonly options: EffectOptions = {},
  ) {}

  run(): unknown {
    if (!this.active) {
      trackingStack.push(trackingEnabled);
      trackingEnabled = false;
      try {
        return this.callback();
      } finally {
        trackingEnabled = trackingStack.pop() ?? true;
      }
    }
    if (effectStack.includes(this)) return this.lastValue;

    cleanupEffect(this);
    effectStack.push(this);
    trackingStack.push(trackingEnabled);
    trackingEnabled = true;
    activeEffect = this;

    try {
      this.lastValue = this.callback();
      return this.lastValue;
    } finally {
      effectStack.pop();
      trackingEnabled = trackingStack.pop() ?? true;
      activeEffect = effectStack.at(-1);
    }
  }

  stop(): void {
    if (!this.active) return;
    cleanupEffect(this);
    this.active = false;
    this.options.onStop?.();
  }
}

function cleanupEffect(effect: ReactiveEffect): void {
  for (const dependency of effect.dependencies) dependency.delete(effect);
  effect.dependencies.clear();
}

export function createReactiveEffect<T>(
  callback: () => T,
  scheduler?: Scheduler,
  options: EffectOptions = {},
): ReactiveEffectRunner<T> {
  const reactiveEffect = new ReactiveEffect(callback, scheduler, options);
  const runner = (() => reactiveEffect.run()) as ReactiveEffectRunner<T>;
  reactiveEffect.runner = runner;
  runnerEffects.set(runner, reactiveEffect);
  return runner;
}

export function effect<T>(
  callback: () => T,
  options: EffectOptions = {},
): ReactiveEffectRunner<T> {
  const runner = createReactiveEffect(callback, undefined, options);
  runner();
  return runner;
}

export function stop(runner: ReactiveEffectRunner): void {
  runnerEffects.get(runner)?.stop();
}

export function track(
  target: object,
  type: TrackOperation,
  key: unknown,
): void {
  const reactiveEffect = activeEffect;
  if (!trackingEnabled || !reactiveEffect?.active) return;

  let dependencies = targetDependencies.get(target);
  if (!dependencies) {
    dependencies = new Map();
    targetDependencies.set(target, dependencies);
  }

  const dependencyKey = type === 'has' ? getHasDependencyKey(target, key) : key;
  let dependency = dependencies.get(dependencyKey);
  if (!dependency) {
    dependency = new Set();
    dependencies.set(dependencyKey, dependency);
  }

  if (dependency.has(reactiveEffect)) return;
  dependency.add(reactiveEffect);
  reactiveEffect.dependencies.add(dependency);

  if (isDevelopment()) {
    reactiveEffect.options.onTrack?.({
      effect: reactiveEffect.runner,
      target,
      type,
      key,
    });
  }
}

function getHasDependencyKey(target: object, key: unknown): symbol {
  let keys = hasDependencyKeys.get(target);
  if (!keys) {
    keys = new Map();
    hasDependencyKeys.set(target, keys);
  }
  let dependencyKey = keys.get(key);
  if (!dependencyKey) {
    dependencyKey = Symbol('gluon has');
    keys.set(key, dependencyKey);
  }
  return dependencyKey;
}

function getExistingHasDependencyKey(target: object, key: unknown): symbol | undefined {
  return hasDependencyKeys.get(target)?.get(key);
}

export function isArrayIndex(key: unknown): key is string {
  if (typeof key !== 'string' || key === '') return false;
  const index = Number(key);
  return Number.isInteger(index)
    && index >= 0
    && index < 4_294_967_295
    && String(index) === key;
}

export function trigger(
  target: object,
  type: TriggerOperation,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
): void {
  const dependencies = targetDependencies.get(target);
  if (!dependencies) return;

  const effects = new Set<ReactiveEffect>();
  const collect = (dependencyKey: unknown): void => {
    for (const reactiveEffect of dependencies.get(dependencyKey) ?? []) {
      effects.add(reactiveEffect);
    }
  };

  if (type === 'clear') {
    for (const dependency of dependencies.values()) {
      for (const reactiveEffect of dependency) effects.add(reactiveEffect);
    }
  } else if (Array.isArray(target) && key === 'length') {
    const length = Number(newValue);
    for (const [dependencyKey, dependency] of dependencies) {
      if (
        dependencyKey === 'length'
        || dependencyKey === ARRAY_ITERATE_KEY
        || (isArrayIndex(dependencyKey) && Number(dependencyKey) >= length)
      ) {
        for (const reactiveEffect of dependency) effects.add(reactiveEffect);
      }
    }
  } else {
    if (key !== undefined) collect(key);
    if ((type === 'add' || type === 'delete') && key !== undefined) {
      const hasDependencyKey = getExistingHasDependencyKey(target, key);
      if (hasDependencyKey) collect(hasDependencyKey);
    }

    if (Array.isArray(target)) {
      if (type === 'add' && isArrayIndex(key ?? '')) collect('length');
      if (type === 'add' || type === 'delete') collect(ARRAY_ITERATE_KEY);
    } else if (target instanceof Map) {
      if (type === 'add' || type === 'delete') {
        collect(ITERATE_KEY);
        collect(MAP_KEY_ITERATE_KEY);
        collect(COLLECTION_SIZE_KEY);
      } else if (type === 'set') {
        collect(ITERATE_KEY);
      }
    } else if (target instanceof Set) {
      if (type === 'add' || type === 'delete') {
        collect(ITERATE_KEY);
        collect(COLLECTION_SIZE_KEY);
      }
    } else if (type === 'add' || type === 'delete') {
      collect(ITERATE_KEY);
    }
  }

  for (const reactiveEffect of effects) {
    if (reactiveEffect === activeEffect) continue;
    if (isDevelopment()) {
      reactiveEffect.options.onTrigger?.({
        effect: reactiveEffect.runner,
        target,
        type,
        key,
        newValue,
        oldValue,
      });
    }
    if (reactiveEffect.scheduler) reactiveEffect.scheduler();
    else reactiveEffect.run();
  }
}
