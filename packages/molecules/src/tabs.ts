import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { tabsStyleDependency } from './tabs-styles.js';

export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsActivation = 'automatic' | 'manual';
export type TabsAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };

export interface TabsItem {
  /** Stable DOM ID base used for the paired tab and panel. */
  readonly id: string;
  readonly value: string;
  readonly label: TemplateValue;
  readonly panel: TemplateValue;
  readonly disabled?: boolean;
}

export type TabsAttributes = Omit<QuarkProps<HTMLDivElement>, 'children'>;
export type TabsChangeEvent = MouseEvent | KeyboardEvent;

export type TabsProps = TabsAccessibleName & {
  readonly value: string;
  readonly items: readonly TabsItem[];
  readonly orientation?: TabsOrientation;
  readonly activation?: TabsActivation;
  readonly onChange?: (value: string, event: TabsChangeEvent) => void;
  readonly attributes?: TabsAttributes;
};

function renderTabs({
  value,
  items,
  label,
  labelledBy,
  orientation = 'horizontal',
  activation = 'automatic',
  onChange,
  attributes = {},
}: TabsProps): TemplateResult {
  const enabled = items.filter((item) => !item.disabled);
  const tabValue = enabled.some((item) => item.value === value) ? value : enabled[0]?.value;
  return q.div({
    ...attributes,
    class: [{ gluon: true, molecule: true, 'gluon-tabs': true, [`is-${orientation}`]: true }, attributes.class],
    children: [
      q.div({
        class: 'gluon-tabs-list',
        role: 'tablist',
        aria: { label, labelledby: labelledBy, orientation },
        children: items.map((item) => q.button({
          id: `${item.id}-tab`,
          class: 'gluon-tabs-tab',
          role: 'tab',
          type: 'button',
          '?disabled': item.disabled,
          tabIndex: item.value === tabValue ? 0 : -1,
          data: { value: item.value },
          aria: { controls: `${item.id}-panel`, selected: item.value === value },
          onClick: (event) => onChange?.(item.value, event),
          onKeydown: (event: KeyboardEvent) => handleKeyDown(event, orientation, activation, onChange),
          children: item.label,
        })),
      }),
      ...items.map((item) => q.div({
        id: `${item.id}-panel`,
        class: 'gluon-tabs-panel',
        role: 'tabpanel',
        tabIndex: item.value === value ? 0 : -1,
        hidden: item.value !== value,
        aria: { labelledby: `${item.id}-tab` },
        children: item.value === value ? item.panel : nothing,
      })),
    ],
  });
}

function handleKeyDown(
  event: KeyboardEvent,
  orientation: TabsOrientation,
  activation: TabsActivation,
  onChange: TabsProps['onChange'],
): void {
  const current = event.currentTarget as HTMLButtonElement;
  const list = current.closest<HTMLElement>('[role="tablist"]');
  if (!list) return;
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')];
  const index = tabs.indexOf(current);
  if (index < 0 || tabs.length === 0) return;
  const rtl = getComputedStyle(list).direction === 'rtl';
  const previousKey = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
  let target: HTMLButtonElement | undefined;
  if (event.key === previousKey) target = tabs[(index - 1 + tabs.length) % tabs.length];
  else if (event.key === nextKey) target = tabs[(index + 1) % tabs.length];
  else if (event.key === 'Home') target = tabs[0];
  else if (event.key === 'End') target = tabs.at(-1);
  if (target) {
    event.preventDefault();
    target.focus();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (activation === 'automatic') {
      const nextValue = target.dataset.value;
      if (nextValue !== undefined) onChange?.(nextValue, event);
    }
    return;
  }
  if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    const nextValue = current.dataset.value;
    if (nextValue !== undefined) onChange?.(nextValue, event);
  }
}

export const Tabs = defineMolecule(renderTabs, 'Tabs', [tabsStyleDependency]);
