import { describe, expect, it } from 'vitest';
import {
  batch,
  invalidateJob,
  nextTick,
  queueJob,
} from '@gluonjs/reactivity';

describe('reactivity scheduler contract', () => {
  it('preserves queue ordering, batch flush order, and invalidation before flush', async () => {
    const calls: string[] = [];
    const low = () => {
      calls.push('low');
    };
    const high = () => {
      calls.push('high');
    };
    const invalidated = () => {
      calls.push('invalidated');
    };

    queueJob(low, { id: 2 });
    queueJob(high, { id: 1 });
    queueJob(invalidated, { id: 3 });
    invalidateJob(invalidated);
    await nextTick();
    expect(calls).toEqual(['high', 'low']);

    calls.length = 0;
    batch(() => {
      queueJob(() => {
        calls.push('batched');
      }, { id: 4 });
      queueJob(() => {
        calls.push('batched-2');
      }, { id: 5 });
    });
    await nextTick();
    expect(calls).toEqual(['batched', 'batched-2']);
  });

  it('can reenter the queue while keeping follow-up work ordered by id', async () => {
    const calls: string[] = [];
    const second = () => {
      calls.push('second');
    };
    const first = () => {
      calls.push('first');
      queueJob(second, { id: 2 });
    };

    queueJob(first, { id: 1 });
    await nextTick();
    expect(calls).toEqual(['first', 'second']);
  });
});
