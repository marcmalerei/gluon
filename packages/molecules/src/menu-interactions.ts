export const menuItemSelector = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';

const connectedRoots = new WeakMap<HTMLElement, AbortController>();

export interface TypeaheadState { buffer: string; at: number; }

export function safeId(value: string): string {
  if (value.length === 0) throw new TypeError('Menu instance and item IDs must not be empty.');
  return [...value].map((character) => {
    if (/^[a-zA-Z0-9-]$/.test(character)) return character;
    if (character === '_') return '__';
    return `_x${character.codePointAt(0)!.toString(16)}_`;
  }).join('');
}

export function itemDomId(instanceId: string, path: readonly string[]): string {
  return `${safeId(instanceId)}-item-${path.map(safeId).join('-')}`;
}

export function menuDomId(instanceId: string, path: readonly string[]): string {
  return `${safeId(instanceId)}-menu${path.length ? `-${path.map(safeId).join('-')}` : ''}`;
}

export function isDisabled(element: HTMLElement): boolean {
  return element.matches(':disabled,[aria-disabled="true"]');
}

export function enabledMenuItems(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>(menuItemSelector)]
    .filter((item) => item.closest('[role="menu"],[role="menubar"]') === menu && !isDisabled(item));
}

function enabledItems(container: HTMLElement): HTMLElement[] {
  return container.matches('[role="toolbar"]')
    ? [...container.querySelectorAll<HTMLElement>(':scope > [data-gluon-toolbar-item]')].filter((item) => !isDisabled(item))
    : enabledMenuItems(container);
}

export function setRoving(container: HTMLElement, target?: HTMLElement): HTMLElement | undefined {
  const items = enabledItems(container);
  const active = container.ownerDocument.activeElement;
  const selected = target && items.includes(target)
    ? target
    : active instanceof HTMLElement && items.includes(active)
      ? active
      : items.find((item) => item.tabIndex === 0) ?? items[0];
  for (const item of items) item.tabIndex = item === selected ? 0 : -1;
  return selected;
}

export function moveFocus(container: HTMLElement, current: HTMLElement, edge: 'first' | 'last' | -1 | 1): void {
  const items = enabledItems(container);
  if (!items.length) return;
  const index = items.indexOf(current);
  const target = edge === 'first' ? items[0] : edge === 'last' ? items.at(-1) : items[(Math.max(0, index) + edge + items.length) % items.length];
  if (!target) return;
  setRoving(container, target);
  target.focus();
}

export function runTypeahead(container: HTMLElement, current: HTMLElement, key: string, state: TypeaheadState): void {
  const now = Date.now();
  state.buffer = now - state.at > 500 ? key : `${state.buffer}${key}`;
  state.at = now;
  const items = enabledItems(container);
  if (!items.length) return;
  const normalized = state.buffer.toLocaleLowerCase();
  const repeated = normalized.length > 1 && [...normalized].every((character) => character === normalized[0]);
  const needle = repeated ? normalized[0]! : normalized;
  const currentIndex = Math.max(0, items.indexOf(current));
  const start = normalized.length === 1 || repeated ? currentIndex + 1 : currentIndex;
  const ordered = [...items.slice(start), ...items.slice(0, start)];
  const target = ordered.find((item) => (item.dataset.textValue ?? item.textContent ?? '').trim().toLocaleLowerCase().startsWith(needle));
  if (target) {
    setRoving(container, target);
    target.focus();
  }
}

export function scheduleFocus(root: HTMLElement | undefined, selector: string, edge: 'first' | 'last' = 'first'): void {
  queueMicrotask(() => {
    const container = root?.querySelector<HTMLElement>(selector);
    if (!container || container.hidden) return;
    const items = enabledMenuItems(container);
    const target = edge === 'last' ? items.at(-1) : items[0];
    if (target) {
      setRoving(container, target);
      target.focus();
    }
  });
}

export function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): unknown } | null | undefined, event: EventType): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export function connectDismissal(root: HTMLElement, open: boolean, close: (event: PointerEvent) => void): void {
  connectedRoots.get(root)?.abort();
  connectedRoots.delete(root);
  if (!open) return;
  const controller = new AbortController();
  connectedRoots.set(root, controller);
  root.ownerDocument.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target as Node)) close(event);
  }, { capture: true, signal: controller.signal });
}
