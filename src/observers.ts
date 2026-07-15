import { shallowRef, type Ref } from '@gluonjs/reactivity';
export interface PlatformObserverHandle<ElementType extends Element, Entry> {
  /** Callback ref that observes its current element and disconnects when cleared. */
  readonly ref: (element: ElementType | undefined) => void;
  /** The latest platform callback batch. It is empty before the first callback and after stop(). */
  readonly entries: Readonly<Ref<readonly Entry[]>>;
  /** Whether the current target's realm exposes the required observer constructor. */
  readonly supported: Readonly<Ref<boolean>>;
  /** Disconnects permanently. Later ref assignments are ignored. */
  stop(): void;
}

type ObserverConstructor<Observer, Entry> = new (
  callback: (entries: Entry[]) => void,
  options?: unknown,
) => Observer;

interface PlatformObserver {
  observe(target: Element, options?: unknown): void;
  disconnect(): void;
}

function createPlatformObserver<ElementType extends Element, Entry, Observer extends PlatformObserver>(
  constructorName: 'IntersectionObserver' | 'ResizeObserver' | 'MutationObserver',
  options: unknown,
  observeOptions?: unknown,
  onEntries?: (entries: readonly Entry[]) => void,
): PlatformObserverHandle<ElementType, Entry> {
  const entries = shallowRef<readonly Entry[]>([]);
  const supported = shallowRef(false);
  let observer: Observer | undefined;
  let target: ElementType | undefined;
  let stopped = false;
  let generation = 0;

  const disconnect = (): void => {
    generation += 1;
    observer?.disconnect();
    observer = undefined;
    target = undefined;
  };

  const ref = (element: ElementType | undefined): void => {
    if (stopped || element === target) return;
    disconnect();
    entries.value = [];
    if (!element) {
      supported.value = false;
      return;
    }

    const realm = element.ownerDocument.defaultView as (Window & Record<string, unknown>) | null;
    const Candidate = realm?.[constructorName] as ObserverConstructor<Observer, Entry> | undefined;
    supported.value = typeof Candidate === 'function';
    if (!Candidate) return;

    const currentGeneration = generation;
    let next: Observer;
    try {
      next = new Candidate((batch) => {
        if (stopped || currentGeneration !== generation) return;
        const snapshot = Object.freeze([...batch]);
        entries.value = snapshot;
        onEntries?.(snapshot);
      }, options);
    } catch (error) {
      supported.value = false;
      throw error;
    }
    if (stopped) {
      next.disconnect();
      return;
    }
    observer = next;
    target = element;
    next.observe(element, observeOptions);
  };

  return {
    ref,
    entries,
    supported,
    stop() {
      if (stopped) return;
      stopped = true;
      disconnect();
      entries.value = [];
      supported.value = false;
    },
  };
}

/** Creates a reactive, callback-ref-owned IntersectionObserver. */
export function createIntersectionObserver<ElementType extends Element = Element>(
  options: IntersectionObserverInit = {},
  onEntries?: (entries: readonly IntersectionObserverEntry[]) => void,
): PlatformObserverHandle<ElementType, IntersectionObserverEntry> {
  return createPlatformObserver('IntersectionObserver', options, undefined, onEntries);
}

/** Creates a reactive, callback-ref-owned ResizeObserver. */
export function createResizeObserver<ElementType extends Element = Element>(
  options: ResizeObserverOptions = {},
  onEntries?: (entries: readonly ResizeObserverEntry[]) => void,
): PlatformObserverHandle<ElementType, ResizeObserverEntry> {
  return createPlatformObserver('ResizeObserver', undefined, options, onEntries);
}

/** Creates a reactive, callback-ref-owned MutationObserver. */
export function createMutationObserver<ElementType extends Element = Element>(
  options: MutationObserverInit,
  onEntries?: (entries: readonly MutationRecord[]) => void,
): PlatformObserverHandle<ElementType, MutationRecord> {
  return createPlatformObserver('MutationObserver', undefined, options, onEntries);
}
