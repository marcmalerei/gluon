import { batch, computed, signal } from '@preact/signals-core';
import { effect, stop } from '@gluonjs/reactivity';
import { describe, expect, it } from 'vitest';
import { fromPreactSignal } from '@gluonjs/reactivity/preact-signals';

async function flush(): Promise<void> {
  await Promise.resolve();
}

describe('Preact Signals interop', () => {
  it('uses the real package for writable, computed, batched, and disposed updates', async () => {
    const price = signal(25);
    const quantity = signal(2);
    const total = computed(() => price.value * quantity.value);
    const quantityBridge = fromPreactSignal(quantity, { connect: true });
    const totalBridge = fromPreactSignal(total, { connect: true });
    const seen: number[] = [];
    const runner = effect(() => seen.push(totalBridge.value));

    batch(() => {
      price.value = 30;
      quantityBridge.value = 3;
    });
    await flush();
    expect(totalBridge.value).toBe(90);
    expect(seen).toEqual([50, 90]);

    totalBridge.disconnect();
    price.value = 40;
    await flush();
    expect(seen).toEqual([50, 90]);
    quantityBridge[Symbol.dispose]();
    stop(runner);
  });

  it('rejects values that are not Preact signals', () => {
    expect(() => fromPreactSignal({ value: 1 } as never)).toThrow('@preact/signals-core');
  });
});
