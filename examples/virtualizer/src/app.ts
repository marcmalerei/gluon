import {
  createApp,
  createVirtualizer,
  html,
  type GluonApp,
  type VirtualizerLayout,
  type VirtualizerOptions,
} from '@gluonjs/core';
import { effect, shallowReactive, stop } from '@gluonjs/reactivity';

export interface InventoryItem {
  readonly id: string;
  readonly name: string;
  readonly category: 'Lighting' | 'Carry' | 'Workspace' | 'Seating';
  readonly stock: number;
  readonly featured: boolean;
}

const categories: readonly InventoryItem['category'][] = ['Lighting', 'Carry', 'Workspace', 'Seating'];

export const initialInventory: readonly InventoryItem[] = Object.freeze(Array.from({ length: 500 }, (_, index) => ({
  id: `GG-${String(index + 1).padStart(4, '0')}`,
  name: `${categories[index % categories.length]} object ${index + 1}`,
  category: categories[index % categories.length]!,
  stock: (index * 7) % 43,
  featured: index % 11 === 0,
})));

export interface VirtualizerExample {
  readonly app: GluonApp;
  readonly state: { items: readonly InventoryItem[]; layout: VirtualizerLayout };
}

export function createVirtualizerExample(): VirtualizerExample {
  const compact = window.matchMedia('(max-width: 760px)');
  const state = shallowReactive<{ items: readonly InventoryItem[]; layout: VirtualizerLayout; columns: number }>({
    items: initialInventory,
    layout: 'grid',
    columns: compact.matches ? 1 : 3,
  });
  const updateColumns = (event: MediaQueryListEvent): void => { state.columns = event.matches ? 1 : 3; };
  compact.addEventListener('change', updateColumns);
  const key = (item: InventoryItem): string => item.id;
  const renderItem = (item: InventoryItem) => html`
    <article class="inventory-card" data-featured=${item.featured}>
      <a href=${`#${item.id}`} aria-label=${`${item.name}, ${item.stock} in stock`}>
        <strong>${item.name}</strong>
        <span>${item.id} · ${item.category} · ${item.stock} in stock</span>
      </a>
    </article>
  `;
  const estimateSize = (item: InventoryItem): number => item.featured ? 148 : 116;
  const itemOptions = (): VirtualizerOptions<InventoryItem> => ({
    items: state.items,
    key,
    renderItem,
    estimateSize,
    layout: state.layout,
    columns: state.layout === 'grid' ? state.columns : 1,
    gap: 8,
    overscan: 2,
    ssrCount: 12,
    ariaLabel: 'GLUON GOODS inventory',
    class: 'inventory-viewport',
  });
  const virtualizer = createVirtualizer(itemOptions());
  const syncVirtualizer = effect(() => { virtualizer.update(itemOptions()); });
  const app = createApp(() => {
    const { start, end } = virtualizer.range.value;
    return html`
      <main class="example-shell">
        <header class="example-header">
          <div>
            <p class="eyebrow">Runnable framework example</p>
            <h1>Accessible inventory virtualization.</h1>
          </div>
          <div class="controls" aria-label="Inventory controls">
            <button type="button" @click=${() => virtualizer.scrollToIndex(249, { behavior: 'smooth', focus: true })}>Jump to 250</button>
            <button type="button" @click=${() => { state.layout = state.layout === 'grid' ? 'list' : 'grid'; }}>Use ${state.layout === 'grid' ? 'list' : 'grid'}</button>
            <button type="button" @click=${() => { state.items = [...state.items].reverse(); }}>Reverse</button>
            <button type="button" @click=${() => { state.items = state.items.slice(0, -1); }} ?disabled=${state.items.length === 0}>Remove last</button>
          </div>
        </header>
        <p class="status" aria-live="polite">
          <span>${state.items.length} logical items</span>
          <span>DOM window ${start + 1}–${end}</span>
        </p>
        ${virtualizer.view()}
      </main>
    `;
  });
  app.use(() => () => {
    compact.removeEventListener('change', updateColumns);
    stop(syncVirtualizer);
    virtualizer.stop();
  });
  return { app, state };
}
