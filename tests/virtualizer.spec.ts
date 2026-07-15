import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVirtualizer, html, hydrate, render, unmount } from '@gluonjs/core';
import { prepareForHydration } from '@gluonjs/ssr';

interface Item { readonly id: string; readonly label: string }

function items(count: number): readonly Item[] {
  return Array.from({ length: count }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }));
}

function createList(count = 100) {
  return createVirtualizer({
    items: items(count),
    key: (item) => item.id,
    renderItem: (item) => html`<button>${item.label}</button>`,
    estimateSize: 40,
    overscan: 1,
    ssrCount: 6,
    ariaLabel: 'Inventory',
    class: 'inventory',
  });
}

class InertResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

async function frame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('createVirtualizer()', () => {
  it('renders a deterministic initial window and updates it for viewport scrolling', async () => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    const virtualizer = createList();
    const root = document.createElement('div');
    document.body.append(root);
    render(virtualizer.view(), root);
    const viewport = root.querySelector<HTMLElement>('.inventory')!;
    viewport.style.height = '120px';
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 120 });
    viewport.dispatchEvent(new Event('scroll'));
    await frame();
    render(virtualizer.view(), root);

    expect(viewport.getAttribute('role')).toBe('list');
    expect(root.querySelectorAll('[role="listitem"]')).toHaveLength(5);
    expect(root.textContent).toContain('Item 0');
    expect(virtualizer.range.value).toEqual({ start: 0, end: 5, totalSize: 4000 });

    viewport.scrollTop = 400;
    viewport.dispatchEvent(new Event('scroll'));
    await frame();
    render(virtualizer.view(), root);
    expect(virtualizer.range.value).toEqual({ start: 8, end: 15, totalSize: 4000 });
    expect(root.textContent).toContain('Item 8');
    expect(root.textContent).not.toContain('Item 0');
    expect(root.querySelector('[aria-posinset="9"]')?.getAttribute('aria-setsize')).toBe('100');
  });

  it('supports grid rows, collection updates, keyboard traversal, and focus retention', async () => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    const virtualizer = createVirtualizer({
      items: items(30),
      key: (item) => item.id,
      renderItem: (item) => html`<button>${item.label}</button>`,
      estimateSize: 50,
      layout: 'grid',
      columns: 3,
      gap: 8,
      overscan: 0,
      ssrCount: 6,
      ariaLabel: 'Products',
    });
    const root = document.createElement('div');
    document.body.append(root);
    render(virtualizer.view(), root);
    const viewport = root.querySelector<HTMLElement>('[role="grid"]')!;
    viewport.style.height = '60px';
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 60 });
    viewport.scrollTo = vi.fn((first?: number | ScrollToOptions, second?: number) => {
      viewport.scrollTop = typeof first === 'number' ? second ?? 0 : Number(first?.top);
    }) as typeof viewport.scrollTo;
    viewport.dispatchEvent(new Event('scroll'));
    await frame();
    render(virtualizer.view(), root);

    expect(viewport.getAttribute('aria-rowcount')).toBe('10');
    expect(viewport.getAttribute('aria-colcount')).toBe('3');
    expect(root.querySelectorAll('[role="row"]')).toHaveLength(2);
    expect(root.querySelectorAll('[role="gridcell"]')).toHaveLength(6);

    const first = root.querySelector<HTMLElement>('[data-gluon-virtual-index="0"]')!;
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await frame();
    render(virtualizer.view(), root);
    await frame();
    expect(viewport.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 58 }));
    expect(root.querySelector('[data-gluon-virtual-index="3"]')).not.toBeNull();

    viewport.scrollTop = 0;
    viewport.dispatchEvent(new Event('scroll'));
    await frame();

    const reordered = [items(30)[29]!, ...items(30).slice(0, 10)];
    virtualizer.update({
      items: reordered,
      key: (item) => item.id,
      renderItem: (item) => item.label,
      estimateSize: 50,
      layout: 'grid',
      columns: 3,
      gap: 8,
      overscan: 0,
      ssrCount: 6,
      ariaLabel: 'Products',
    });
    render(virtualizer.view(), root);
    expect(root.textContent).toContain('Item 29');
    expect(virtualizer.range.value.totalSize).toBe(224);
  });

  it('uses measurements to preserve the scroll anchor and releases every owned resource', async () => {
    let callback: ResizeObserverCallback | undefined;
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    class TestResizeObserver {
      constructor(next: ResizeObserverCallback) { callback = next; }
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    const virtualizer = createList(20);
    const root = document.createElement('div');
    document.body.append(root);
    render(virtualizer.view(), root);
    const viewport = root.querySelector<HTMLElement>('.inventory')!;
    viewport.style.height = '80px';
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 80 });
    viewport.scrollTop = 260;
    viewport.dispatchEvent(new Event('scroll'));
    await frame();
    render(virtualizer.view(), root);
    const measured = root.querySelector<HTMLElement>(
      `[data-gluon-virtual-row="${virtualizer.range.value.start}"]`,
    )!;
    expect(observe).toHaveBeenCalledWith(measured);
    callback?.([{ target: measured, contentRect: { height: 70 }, borderBoxSize: [] } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    await frame();
    expect(virtualizer.range.value.totalSize).toBe(830);
    expect(viewport.scrollTop).toBeCloseTo(290, 0);

    expect(() => virtualizer.scrollToIndex(-1)).toThrow('outside the collection');
    unmount(root);
    virtualizer.ref(undefined);
    virtualizer.stop();
    expect(disconnect).toHaveBeenCalled();
    expect(unobserve).toHaveBeenCalled();
    expect(virtualizer.range.value).toEqual({ start: 0, end: 0, totalSize: 0 });
  });

  it('validates options and handles empty and unsupported observer environments', () => {
    expect(() => createVirtualizer({
      items: items(1), key: (item) => item.id, renderItem: () => '', estimateSize: 0, ariaLabel: 'Items',
    })).toThrow('positive finite');
    expect(() => createVirtualizer({
      items: items(1), key: (item) => item.id, renderItem: () => '', estimateSize: 10, columns: 0, ariaLabel: 'Items',
    })).toThrow('positive integer');
    expect(() => createVirtualizer({
      items: items(2), key: () => 'duplicate', renderItem: () => '', estimateSize: 10, ariaLabel: 'Items',
    })).toThrow('unique');
    expect(() => createVirtualizer({
      items: items(1), key: () => null as never, renderItem: () => '', estimateSize: 10, ariaLabel: 'Items',
    })).toThrow('unique string');
    expect(() => createVirtualizer({
      items: items(1), key: (item) => item.id, renderItem: () => '', estimateSize: () => Number.NaN, ariaLabel: 'Items',
    })).toThrow('positive finite');
    expect(() => createVirtualizer({
      items: [], key: (item: Item) => item.id, renderItem: () => '', estimateSize: 10, gap: -1, ariaLabel: 'Items',
    })).toThrow('non-negative');
    expect(() => createVirtualizer({
      items: [], key: (item: Item) => item.id, renderItem: () => '', estimateSize: 10, overscan: Number.NaN, ariaLabel: 'Items',
    })).toThrow('non-negative');
    expect(() => createVirtualizer({
      items: [], key: (item: Item) => item.id, renderItem: () => '', estimateSize: 10, ssrCount: 0, ariaLabel: 'Items',
    })).toThrow('positive integer');
    expect(() => createVirtualizer({
      items: [], key: (item: Item) => item.id, renderItem: () => '', estimateSize: 10, ariaLabel: '  ',
    })).toThrow('must not be empty');
    const empty = createVirtualizer({
      items: [], key: (item: Item) => item.id, renderItem: () => '', estimateSize: 10, ariaLabel: 'Empty',
    });
    const root = document.createElement('div');
    render(empty.view(), root);
    expect(root.querySelectorAll('[role="listitem"]')).toHaveLength(0);
    expect(empty.range.value.totalSize).toBe(0);
    const detached = createList(1);
    expect(() => detached.scrollToIndex(0)).not.toThrow();
    const otherDocument = document.implementation.createHTMLDocument('detached');
    const detachedViewport = otherDocument.createElement('div');
    detached.ref(detachedViewport);
    detachedViewport.dispatchEvent(new Event('scroll'));
    detached.ref(detachedViewport);
    detached.ref(undefined);
    detached.stop();
    detached.stop();
    detached.update({
      items: [], key: (item) => item.id, renderItem: () => '', estimateSize: 10, ariaLabel: 'Stopped',
    });
    empty.stop();
  });

  it('hydrates the deterministic initial window without replacing matching DOM', async () => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    const serverVirtualizer = createList(12);
    const prepared = await prepareForHydration(serverVirtualizer.view());
    const markup = prepared.html;
    const clientRoot = document.createElement('div');
    clientRoot.innerHTML = markup;
    document.body.append(clientRoot);
    const retainedFirstItem = clientRoot.querySelector('[data-gluon-virtual-index="0"]');
    const clientVirtualizer = createList(12);

    const result = hydrate(clientVirtualizer.view() as import('@gluonjs/core').TemplateResult, clientRoot, {
      expectedMarkup: markup,
    });

    expect(result.mismatches).toEqual([]);
    expect(clientRoot.querySelector('[data-gluon-virtual-index="0"]')).toBe(retainedFirstItem);
    expect(clientRoot.querySelectorAll('[role="listitem"]')).toHaveLength(6);
    clientVirtualizer.stop();
    serverVirtualizer.stop();
  });
});
