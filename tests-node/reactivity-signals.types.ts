import { Signal, fromStandardSignal, type SignalBridge, type WritableSignalBridge } from '../packages/reactivity/dist/signals/index.js';
import { fromPreactSignal } from '../packages/reactivity/dist/preact-signals.js';
import { computed, signal } from '@preact/signals-core';

const standardState = new Signal.State(1);
const standardComputed = new Signal.Computed(() => standardState.get() * 2);
const writable: WritableSignalBridge<number> = fromStandardSignal(standardState);
const readonly: SignalBridge<number> = fromStandardSignal(standardComputed);
writable.value = readonly.value;
writable.connect();
writable.disconnect();
writable[Symbol.dispose]();

const preactState = signal(1);
const preactComputed = computed(() => preactState.value * 2);
const preactWritable: WritableSignalBridge<number> = fromPreactSignal(preactState);
const preactReadonly: SignalBridge<number> = fromPreactSignal(preactComputed);
preactWritable.value = preactReadonly.value;

// @ts-expect-error computed bridges are readonly
readonly.value = 4;
// @ts-expect-error Preact computed bridges are readonly
preactReadonly.value = 4;
