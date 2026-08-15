import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { toolbarStyleDependency } from './toolbar-styles.js';

type Orientation = 'horizontal' | 'vertical';
type ToolbarAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role'>;

interface ToolbarItemBase { readonly id: string; readonly label: TemplateValue; readonly disabled?: boolean; readonly textValue?: string; }
export interface ToolbarButtonItem extends ToolbarItemBase { readonly kind?: 'button'; readonly attributes?: Omit<QuarkProps<HTMLButtonElement>, 'children' | 'type' | 'tabIndex'>; readonly onActivate?: (event: MouseEvent) => void; }
export interface ToolbarLinkItem extends ToolbarItemBase { readonly kind: 'link'; readonly href: string; readonly target?: string; readonly attributes?: Omit<QuarkProps<HTMLAnchorElement>, 'children' | 'href' | 'tabIndex'>; readonly onActivate?: (event: MouseEvent) => void; }
export interface ToolbarSeparatorItem { readonly id: string; readonly kind: 'separator'; }
export type ToolbarItem = ToolbarButtonItem | ToolbarLinkItem | ToolbarSeparatorItem;
export interface ToolbarProps { readonly id: string; readonly label: string; readonly items: readonly ToolbarItem[]; readonly orientation?: Orientation; readonly attributes?: ToolbarAttributes; }

const toolbarItemId = (instanceId: string, itemId: string): string => `${encodeURIComponent(instanceId)}-item-${encodeURIComponent(itemId)}`;
const controls = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(':scope > [data-gluon-toolbar-item]')].filter((item) => !item.matches(':disabled,[aria-disabled="true"]'));
function focusControl(root: HTMLElement, current: HTMLElement, destination: 'first' | 'last' | -1 | 1): void {
  const items = controls(root);
  const index = items.indexOf(current);
  const target = destination === 'first' ? items[0] : destination === 'last' ? items.at(-1) : items[(Math.max(0, index) + destination + items.length) % items.length];
  for (const item of items) item.tabIndex = item === target ? 0 : -1;
  target?.focus();
}

function renderToolbar(props: ToolbarProps): TemplateResult {
  const orientation = props.orientation ?? 'horizontal';
  const firstEnabled = props.items.find((item) => item.kind !== 'separator' && !item.disabled);
  return q.div({
    ...props.attributes, id: props.id, role: 'toolbar', class: [{ gluon: true, molecule: true, 'gluon-toolbar': true, [`is-${orientation}`]: true }, props.attributes?.class], part: 'toolbar', data: { ...props.attributes?.data, orientation }, aria: { label: props.label, orientation },
    ref: (element) => { if (element) queueMicrotask(() => { const items = controls(element); for (const [index, item] of items.entries()) item.tabIndex = index === 0 ? 0 : -1; }); },
    onFocusIn: (event) => { const root = event.currentTarget as HTMLElement; const item = (event.target as Element).closest<HTMLElement>('[data-gluon-toolbar-item]'); if (item && !item.matches(':disabled,[aria-disabled="true"]')) { for (const control of controls(root)) control.tabIndex = control === item ? 0 : -1; } },
    onKeydown: (event) => {
      const root = event.currentTarget as HTMLElement;
      const current = (event.target as Element).closest<HTMLElement>('[data-gluon-toolbar-item]');
      if (!current || current.matches(':disabled,[aria-disabled="true"]')) return;
      const rtl = getComputedStyle(root).direction === 'rtl';
      const previous = orientation === 'horizontal' ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
      const next = orientation === 'horizontal' ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
      if (event.key === previous || event.key === next || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        focusControl(root, current, event.key === previous ? -1 : event.key === next ? 1 : event.key === 'Home' ? 'first' : 'last');
      }
    },
    children: props.items.map((item) => {
      if (item.kind === 'separator') return q.span({ id: toolbarItemId(props.id, item.id), role: 'separator', class: 'gluon-toolbar-separator', part: 'separator' });
      const { onClick, ...attributes } = item.attributes ?? {};
      const common = { ...attributes, id: toolbarItemId(props.id, item.id), class: ['gluon-toolbar-item', item.attributes?.class], part: 'item', tabIndex: item === firstEnabled ? 0 : -1, data: { ...item.attributes?.data, gluonToolbarItem: true, value: item.id, textValue: item.textValue }, aria: { ...item.attributes?.aria, disabled: item.disabled || undefined }, onClick: (event: MouseEvent) => { if (typeof onClick === 'function') onClick(event); else onClick?.handleEvent(event); if (!event.defaultPrevented && !item.disabled) item.onActivate?.(event); }, children: item.label };
      return item.kind === 'link' ? q.a({ ...(common as unknown as QuarkProps<HTMLAnchorElement>), href: item.href, target: item.target }) : q.button({ ...(common as unknown as QuarkProps<HTMLButtonElement>), type: 'button', disabled: item.disabled });
    }),
  });
}

export const Toolbar = defineMolecule(renderToolbar, 'Toolbar', [toolbarStyleDependency]);
