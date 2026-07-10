import {
  computed,
  effect,
  reactive,
  readonly,
  ref,
  shallowReadonly,
  stop,
  type ComputedRef,
  type DeepReadonly,
  type EffectDebuggerEvent,
  type ReactiveEffectRunner,
  type Ref,
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
  onTrack(event: EffectDebuggerEvent) {
    event.effect;
    event.key;
  },
});

writable.value = doubled.value;
shallow.count;
stop(runner);

// @ts-expect-error deep readonly properties cannot be assigned
view.nested.label = 'changed';
// @ts-expect-error readonly computed values cannot be assigned
doubled.value = 4;
// @ts-expect-error deep readonly arrays expose no mutable push API
listView.push({ count: 2 });
// @ts-expect-error refs preserve their value type
count.value = 'invalid';
