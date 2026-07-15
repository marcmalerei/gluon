import { Signal, fromStandardSignal, type SignalBridge } from '@gluonjs/reactivity/signals';
import type { Product } from './data.js';

export interface InventorySnapshot {
  readonly label: string;
  readonly dispatch: string;
}

interface InventorySignalRecord {
  readonly state: InstanceType<typeof Signal.State<InventorySnapshot>>;
  readonly bridge: SignalBridge<InventorySnapshot>;
}

const inventorySignals = new Map<string, InventorySignalRecord>();

function snapshot(product: Product): InventorySnapshot {
  return {
    label: product.availability === 'in-stock' ? 'In stock' : 'Low stock',
    dispatch: product.dispatch,
  };
}

export function inventorySignal(product: Product): SignalBridge<InventorySnapshot> {
  let record = inventorySignals.get(product.slug);
  if (!record) {
    const state = new Signal.State(snapshot(product));
    const computed = new Signal.Computed(() => state.get());
    record = {
      state,
      bridge: fromStandardSignal(computed),
    };
    inventorySignals.set(product.slug, record);
  }
  return record.bridge;
}

export function publishInventory(product: Product): InventorySnapshot {
  const record = inventorySignals.get(product.slug);
  if (!record) {
    inventorySignal(product);
    return publishInventory(product);
  }
  const next = snapshot(product);
  record.state.set(next);
  return next;
}
