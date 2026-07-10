import {
  batch,
  computed,
  effect,
  effectScope,
  nextTick,
  onScopeDispose,
  queueJob,
  reactive,
  readonly,
  ref,
  setReactivityErrorHandler,
  shallowReadonly,
  stop,
  untracked,
  watch,
  watchEffect,
  type ComputedRef,
  type DeepReadonly,
  type EffectDebuggerEvent,
  type FlushPhase,
  type ReactivityErrorHandler,
  type ReactiveEffectRunner,
  type Ref,
  type WatchStopHandle,
  type WritableComputedRef,
} from '../packages/reactivity/dist/index.js';

const count: Ref<number> = ref(1);
const state = reactive({ count: 1, nested: { label: 'ready' } });
const listView = readonly([{ count: 1 }]);
const view: DeepReadonly<typeof state> = readonly(state);
const shallow = shallowReadonly(state);
const doubled: ComputedRef<number> = computed(() => count.value * 2);
const writable: WritableComputedRef<number> = computed({
  get: () => count.value,
  set: (value) => { count.value = value; },
});
const runner: ReactiveEffectRunner<number> = effect(() => state.count, {
  flush: 'pre',
  id: 1,
  onTrack(event: EffectDebuggerEvent) {
    event.effect;
    event.key;
  },
});
const phase: FlushPhase = 'update';
const scope = effectScope({
  onError(context) {
    context.phase;
  },
});
const stopWatch: WatchStopHandle = watch(count, (value, oldValue, onCleanup) => {
  value.toFixed();
  oldValue?.toFixed();
  onCleanup(() => undefined);
});
const stopWatchEffect = watchEffect((onCleanup) => {
  count.value;
  onCleanup(() => undefined);
});
const errorHandler: ReactivityErrorHandler = ({ error }) => { void error; };
const restoreErrorHandler = setReactivityErrorHandler(errorHandler);

writable.value = doubled.value;
shallow.count;
phase;
scope.run(() => onScopeDispose(() => undefined));
queueJob(() => undefined, { phase: 'update', id: 1, onError: errorHandler });
const batched: number = batch(() => untracked(() => count.value));
const tick: Promise<number> = nextTick(() => batched);
void tick;
stopWatch();
stopWatchEffect();
restoreErrorHandler();
stop(runner);

// @ts-expect-error deep readonly properties cannot be assigned
view.nested.label = 'changed';
// @ts-expect-error readonly computed values cannot be assigned
doubled.value = 4;
// @ts-expect-error deep readonly arrays expose no mutable push API
listView.push({ count: 2 });
// @ts-expect-error refs preserve their value type
count.value = 'invalid';
