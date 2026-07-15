import { shallowRef, type Ref } from '@gluonjs/reactivity';
import { event, html, repeat, type Key, type TemplateResult, type TemplateValue } from './runtime.js';

export type VirtualizerLayout = 'list' | 'grid';

export interface VirtualizerOptions<Item> {
  readonly items: readonly Item[];
  readonly key: (item: Item, index: number) => Key;
  readonly renderItem: (item: Item, index: number) => TemplateValue;
  readonly estimateSize: number | ((item: Item, index: number) => number);
  readonly layout?: VirtualizerLayout;
  readonly columns?: number;
  readonly gap?: number;
  readonly overscan?: number;
  readonly ssrCount?: number;
  readonly ariaLabel: string;
  readonly class?: string;
}

export interface VirtualizerRange {
  readonly start: number;
  readonly end: number;
  readonly totalSize: number;
}

export interface VirtualizerHandle<Item> {
  /** Reactive inclusive/exclusive item range currently represented in the DOM. */
  readonly range: Readonly<Ref<VirtualizerRange>>;
  /** Callback ref owning scroll, resize, focus, and measurement resources. */
  readonly ref: (element: HTMLElement | undefined) => void;
  /** Updates the collection without replacing the controller. */
  update(options: VirtualizerOptions<Item>): void;
  /** Scrolls the item into view and optionally moves keyboard focus to it. */
  scrollToIndex(index: number, options?: ScrollToOptions & { readonly focus?: boolean }): void;
  /** Returns the accessible virtual viewport. SSR gets the deterministic initial window. */
  view(): TemplateResult;
  /** Permanently releases all observers, listeners, and queued animation frames. */
  stop(): void;
}

interface Row {
  readonly index: number;
  readonly start: number;
  readonly size: number;
}

const defaultRange: VirtualizerRange = Object.freeze({ start: 0, end: 0, totalSize: 0 });

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer.`);
  return value;
}

function nonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite non-negative number.`);
  return value;
}

function validateOptions<Item>(options: VirtualizerOptions<Item>): void {
  positiveInteger(options.columns ?? 1, 'columns');
  nonNegative(options.gap ?? 0, 'gap');
  nonNegative(options.overscan ?? 1, 'overscan');
  positiveInteger(options.ssrCount ?? 10, 'ssrCount');
  if (!options.ariaLabel.trim()) throw new TypeError('ariaLabel must not be empty.');
  const keys = new Set<Key>();
  for (let index = 0; index < options.items.length; index += 1) {
    const key = options.key(options.items[index]!, index);
    if ((typeof key !== 'string' && typeof key !== 'number' && typeof key !== 'symbol') || keys.has(key)) {
      throw new TypeError(`key must return a unique string, number, or symbol at index ${index}.`);
    }
    keys.add(key);
    const size = typeof options.estimateSize === 'number'
      ? options.estimateSize
      : options.estimateSize(options.items[index]!, index);
    if (!Number.isFinite(size) || size <= 0) {
      throw new RangeError(`estimateSize must return a positive finite number at index ${index}.`);
    }
  }
}

/**
 * Creates an accessible vertical list/grid virtualizer with deterministic SSR output.
 * The handle owns its viewport through ref and remains inert when browser observers
 * are unavailable.
 */
export function createVirtualizer<Item>(initialOptions: VirtualizerOptions<Item>): VirtualizerHandle<Item> {
  validateOptions(initialOptions);
  let options = initialOptions;
  let viewport: HTMLElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let frame: number | undefined;
  let stopped = false;
  let focusedKey: Key | undefined;
  const measurements = new Map<Key, number>();
  const rowElements = new Map<number, HTMLElement>();
  const range = shallowRef<VirtualizerRange>(defaultRange);

  const columns = (): number => options.layout === 'grid' ? options.columns ?? 1 : 1;
  const gap = (): number => options.gap ?? 0;
  const itemKey = (index: number): Key => options.key(options.items[index]!, index);
  const estimate = (index: number): number => typeof options.estimateSize === 'number'
    ? options.estimateSize
    : options.estimateSize(options.items[index]!, index);
  const rowCount = (): number => Math.ceil(options.items.length / columns());
  const rowSize = (rowIndex: number): number => {
    let size = 0;
    const first = rowIndex * columns();
    const end = Math.min(first + columns(), options.items.length);
    for (let index = first; index < end; index += 1) {
      size = Math.max(size, measurements.get(itemKey(index)) ?? estimate(index));
    }
    return size;
  };
  const rows = (): readonly Row[] => {
    const result: Row[] = [];
    let start = 0;
    for (let index = 0; index < rowCount(); index += 1) {
      const size = rowSize(index);
      result.push({ index, start, size });
      start += size + (index === rowCount() - 1 ? 0 : gap());
    }
    return result;
  };

  const calculate = (): void => {
    if (stopped) return;
    const allRows = rows();
    const totalSize = allRows.length === 0
      ? 0
      : allRows[allRows.length - 1]!.start + allRows[allRows.length - 1]!.size;
    const scrollTop = viewport?.scrollTop ?? 0;
    const height = viewport?.clientHeight ?? 0;
    let firstRow = 0;
    while (firstRow < allRows.length && allRows[firstRow]!.start + allRows[firstRow]!.size < scrollTop) {
      firstRow += 1;
    }
    let lastRow = firstRow;
    const edge = height > 0 ? scrollTop + height : Number.NEGATIVE_INFINITY;
    while (lastRow < allRows.length && allRows[lastRow]!.start <= edge) lastRow += 1;
    const overscan = Math.floor(options.overscan ?? 1);
    firstRow = Math.max(0, firstRow - overscan);
    lastRow = height > 0
      ? Math.min(allRows.length, lastRow + overscan)
      : Math.min(allRows.length, Math.ceil((options.ssrCount ?? 10) / columns()));

    if (focusedKey !== undefined) {
      const focusedIndex = options.items.findIndex((item, index) => options.key(item, index) === focusedKey);
      if (focusedIndex >= 0) {
        const focusedRow = Math.floor(focusedIndex / columns());
        firstRow = Math.min(firstRow, focusedRow);
        lastRow = Math.max(lastRow, focusedRow + 1);
      }
    }
    const next = Object.freeze({
      start: Math.min(options.items.length, firstRow * columns()),
      end: Math.min(options.items.length, lastRow * columns()),
      totalSize,
    });
    const current = range.value;
    if (current.start !== next.start || current.end !== next.end || current.totalSize !== next.totalSize) {
      range.value = next;
    }
  };

  const schedule = (): void => {
    if (stopped || frame !== undefined) return;
    const realm = viewport?.ownerDocument.defaultView;
    if (!realm) {
      calculate();
      return;
    }
    frame = realm.requestAnimationFrame(() => {
      frame = undefined;
      calculate();
    });
  };

  const disconnect = (): void => {
    if (viewport) {
      viewport.removeEventListener('scroll', schedule);
      viewport.removeEventListener('focusin', onFocusIn);
    }
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    rowElements.clear();
    if (frame !== undefined && viewport?.ownerDocument.defaultView) {
      viewport.ownerDocument.defaultView.cancelAnimationFrame(frame);
    }
    frame = undefined;
    viewport = undefined;
  };

  function onFocusIn(eventValue: FocusEvent): void {
    const target = eventValue.target;
    if (!(target instanceof Element)) return;
    const owner = target.closest<HTMLElement>('[data-gluon-virtual-key]');
    const keyIndex = owner?.dataset.gluonVirtualIndex;
    if (keyIndex !== undefined) focusedKey = itemKey(Number(keyIndex));
  }

  const ref = (element: HTMLElement | undefined): void => {
    if (stopped || element === viewport) return;
    disconnect();
    if (!element) return;
    viewport = element;
    element.addEventListener('scroll', schedule, { passive: true });
    element.addEventListener('focusin', onFocusIn);
    const realm = element.ownerDocument.defaultView as (Window & { ResizeObserver?: typeof ResizeObserver }) | null;
    if (realm?.ResizeObserver) {
      resizeObserver = new realm.ResizeObserver((entries) => {
        const currentRows = rows();
        let anchorRow = 0;
        while (
          anchorRow < currentRows.length
          && currentRows[anchorRow]!.start + currentRows[anchorRow]!.size < (viewport?.scrollTop ?? 0)
        ) anchorRow += 1;
        const anchor = anchorRow * columns();
        let adjustment = 0;
        for (const entry of entries) {
          if (entry.target === viewport) {
            schedule();
            continue;
          }
          const rowIndex = Number((entry.target as HTMLElement).dataset.gluonVirtualRow);
          const row = currentRows[rowIndex];
          const size = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
          if (!row || !Number.isFinite(size) || size <= 0 || size === row.size) continue;
          const first = rowIndex * columns();
          const end = Math.min(first + columns(), options.items.length);
          for (let index = first; index < end; index += 1) measurements.set(itemKey(index), size);
          if (first < anchor) adjustment += size - row.size;
        }
        if (adjustment !== 0 && viewport) viewport.scrollTop += adjustment;
        schedule();
      });
      resizeObserver.observe(element);
    }
    calculate();
  };

  const rowRef = (rowIndex: number) => (element: HTMLElement | undefined): void => {
    const previous = rowElements.get(rowIndex);
    if (previous && previous !== element) resizeObserver?.unobserve(previous);
    if (!element) {
      rowElements.delete(rowIndex);
      return;
    }
    rowElements.set(rowIndex, element);
    resizeObserver?.observe(element);
  };

  const visibleRows = (): readonly Row[] => {
    const allRows = rows();
    const first = Math.floor(range.value.start / columns());
    const end = Math.ceil(range.value.end / columns());
    return allRows.slice(first, end);
  };

  const renderRow = (row: Row): TemplateValue => {
    const first = row.index * columns();
    const end = Math.min(first + columns(), options.items.length);
    const rowItems = options.items.slice(first, end);
    const role = options.layout === 'grid' ? 'row' : 'presentation';
    return html`
      <div
        role=${role}
        data-gluon-virtual-row=${row.index}
        style=${`position:absolute;inset-inline:0;top:0;transform:translateY(${row.start}px);display:${options.layout === 'grid' ? 'grid' : 'block'};${options.layout === 'grid' ? `grid-template-columns:repeat(${columns()},minmax(0,1fr));gap:${gap()}px;` : ''}`}
        ...=${{ ref: rowRef(row.index) }}
      >
        ${repeat(rowItems, (item, offset) => options.key(item, first + offset), (item, offset) => {
          const index = first + offset;
          return html`
            <div
              role=${options.layout === 'grid' ? 'gridcell' : 'listitem'}
              aria-posinset=${index + 1}
              aria-setsize=${options.items.length}
              aria-rowindex=${options.layout === 'grid' ? row.index + 1 : undefined}
              aria-colindex=${options.layout === 'grid' ? offset + 1 : undefined}
              data-gluon-virtual-key
              data-gluon-virtual-index=${index}
              tabindex="-1"
            >${options.renderItem(item, index)}</div>
          `;
        })}
      </div>
    `;
  };

  calculate();

  const handle: VirtualizerHandle<Item> = {
    range,
    ref,
    update(nextOptions) {
      if (stopped) return;
      validateOptions(nextOptions);
      options = nextOptions;
      const keys = new Set(nextOptions.items.map((item, index) => nextOptions.key(item, index)));
      for (const key of measurements.keys()) if (!keys.has(key)) measurements.delete(key);
      if (focusedKey !== undefined && !keys.has(focusedKey)) focusedKey = undefined;
      calculate();
    },
    scrollToIndex(index, scrollOptions = {}) {
      if (!Number.isInteger(index) || index < 0 || index >= options.items.length) {
        throw new RangeError(`Virtualizer index ${index} is outside the collection.`);
      }
      if (!viewport) return;
      const row = rows()[Math.floor(index / columns())]!;
      const { focus = false, ...platformOptions } = scrollOptions;
      viewport.scrollTo({ ...platformOptions, top: row.start });
      calculate();
      if (focus) {
        focusedKey = itemKey(index);
        schedule();
        viewport.ownerDocument.defaultView?.requestAnimationFrame(() => {
          viewport?.querySelector<HTMLElement>(`[data-gluon-virtual-index="${index}"]`)?.focus();
        });
      }
    },
    view() {
      const current = range.value;
      return html`
        <div
          class=${options.class}
          role=${options.layout === 'grid' ? 'grid' : 'list'}
          aria-label=${options.ariaLabel}
          aria-rowcount=${options.layout === 'grid' ? rowCount() : undefined}
          aria-colcount=${options.layout === 'grid' ? columns() : undefined}
          style="overflow:auto;position:relative"
          @keydown=${event((rawEvent: Event) => {
            const eventValue = rawEvent as KeyboardEvent;
            if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(eventValue.key)) return;
            const currentElement = eventValue.target instanceof Element
              ? eventValue.target.closest<HTMLElement>('[data-gluon-virtual-index]')
              : null;
            const currentIndex = Number(currentElement?.dataset.gluonVirtualIndex ?? 0);
            const step = options.layout === 'grid' ? columns() : 1;
            const nextIndex = eventValue.key === 'Home' ? 0
              : eventValue.key === 'End' ? options.items.length - 1
                : eventValue.key === 'ArrowDown' ? Math.min(options.items.length - 1, currentIndex + step)
                  : eventValue.key === 'ArrowUp' ? Math.max(0, currentIndex - step)
                    : eventValue.key === 'ArrowRight' ? Math.min(options.items.length - 1, currentIndex + 1)
                      : Math.max(0, currentIndex - 1);
            eventValue.preventDefault();
            handle.scrollToIndex(nextIndex, { focus: true });
          })}
          ...=${{ ref }}
        >
          <div style=${`height:${current.totalSize}px;position:relative`}>
            ${repeat(visibleRows(), (row) => itemKey(row.index * columns()), renderRow)}
          </div>
        </div>
      `;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      disconnect();
      measurements.clear();
      focusedKey = undefined;
      range.value = defaultRange;
    },
  };
  return handle;
}
