import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { notificationCenterStyleDependency } from './notification-center-styles.js';

export type NotificationCenterTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type NotificationCenterAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLElement>['aria']>, 'label'>;
};
export type NotificationCenterTriggerAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'expanded' | 'controls'>;
};
export type NotificationCenterPanelAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'role' | 'aria' | 'hidden'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'labelledby'>;
};

export interface NotificationCenterItem {
  readonly id: string;
  readonly title: string;
  readonly body?: TemplateValue;
  readonly tone?: NotificationCenterTone;
  readonly read?: boolean;
  readonly timestamp?: string;
  readonly meta?: TemplateValue;
  readonly action?: TemplateValue;
}

export interface NotificationCenterProps {
  readonly id: string;
  readonly label: string;
  readonly notifications: readonly NotificationCenterItem[];
  readonly open?: boolean;
  readonly heading?: TemplateValue;
  readonly emptyContent?: TemplateValue;
  readonly triggerLabel?: TemplateValue;
  readonly markReadLabel?: (notification: NotificationCenterItem) => string;
  readonly dismissLabel?: (notification: NotificationCenterItem) => string;
  readonly onOpenChange?: (open: boolean, event: Event) => void;
  readonly onMarkRead?: (id: string, event: Event) => void;
  readonly onDismiss?: (id: string, event: Event) => void;
  readonly attributes?: NotificationCenterAttributes;
  readonly triggerAttributes?: NotificationCenterTriggerAttributes;
  readonly panelAttributes?: NotificationCenterPanelAttributes;
}

const tones = new Set<NotificationCenterTone>(['neutral', 'info', 'success', 'warning', 'danger']);
const safeId = /^[A-Za-z][A-Za-z0-9_-]*$/u;

function assertId(name: string, value: string): void {
  if (!safeId.test(value)) throw new TypeError(`${name} must be an HTML-safe id beginning with a letter.`);
}

function assertItems(items: readonly NotificationCenterItem[]): void {
  const ids = new Set<string>();
  for (const item of items) {
    assertId('NotificationCenter item id', item.id);
    if (ids.has(item.id)) throw new TypeError(`NotificationCenter item ids must be unique: ${item.id}.`);
    if (!item.title.trim()) throw new TypeError('NotificationCenter item title must be non-empty.');
    if (item.timestamp !== undefined && !item.timestamp.trim()) throw new TypeError('NotificationCenter item timestamp must be non-empty.');
    if (item.tone !== undefined && !tones.has(item.tone)) throw new TypeError(`Unsupported NotificationCenter tone: ${String(item.tone)}.`);
    ids.add(item.id);
  }
}

function renderNotificationCenter({
  id,
  label,
  notifications,
  open = false,
  heading,
  emptyContent = 'No notifications',
  triggerLabel = 'Notifications',
  markReadLabel = (notification) => `Mark ${notification.title} as read`,
  dismissLabel = (notification) => `Dismiss ${notification.title}`,
  onOpenChange,
  onMarkRead,
  onDismiss,
  attributes = {},
  triggerAttributes = {},
  panelAttributes = {},
}: NotificationCenterProps): TemplateResult {
  assertId('NotificationCenter.id', id);
  if (!label.trim()) throw new TypeError('NotificationCenter.label must be non-empty.');
  assertItems(notifications);
  const panelId = `${id}-panel`;
  const headingId = `${id}-heading`;
  const unread = notifications.filter((notification) => !notification.read).length;
  const accessibleTriggerLabel = `${label}${unread > 0 ? `, ${unread} unread` : ''}`;
  const renderAction = (item: NotificationCenterItem): TemplateValue => q.div({ part: 'actions', class: 'gluon-notification-center-actions', children: [
    item.action ?? nothing,
    onMarkRead && !item.read ? q.button({
      ...triggerAttributes,
      type: 'button',
      class: [{ 'gluon-notification-center-action': true }, triggerAttributes.class],
      aria: { label: markReadLabel(item) },
      onClick: (event: MouseEvent) => onMarkRead(item.id, event),
      children: 'Mark read',
    }) : nothing,
    onDismiss ? q.button({
      ...triggerAttributes,
      type: 'button',
      class: [{ 'gluon-notification-center-action': true }, triggerAttributes.class],
      aria: { label: dismissLabel(item) },
      onClick: (event: MouseEvent) => onDismiss(item.id, event),
      children: 'Dismiss',
    }) : nothing,
  ] });
  const list = notifications.map((item) => q.li({
    id: `${id}-item-${item.id}`,
    part: 'item',
    class: [{ 'gluon-notification-center-item': true, [`is-${item.tone ?? 'neutral'}`]: true }, item.read ? 'is-read' : 'is-unread'],
    'data-tone': item.tone ?? 'neutral',
    'data-read': item.read ? 'true' : 'false',
    children: q.article({ part: 'item-content', class: 'gluon-notification-center-item-content', children: [
      q.div({ part: 'item-header', class: 'gluon-notification-center-item-header', children: [
        q.h3({ part: 'item-title', class: 'gluon-notification-center-item-title', children: item.title }),
        item.timestamp ? q.time({ part: 'timestamp', class: 'gluon-notification-center-item-timestamp', dateTime: item.timestamp, children: item.timestamp }) : nothing,
      ] }),
      item.body === undefined ? nothing : q.div({ part: 'body', class: 'gluon-notification-center-item-body', children: item.body }),
      item.meta === undefined ? nothing : q.div({ part: 'meta', class: 'gluon-notification-center-item-meta', children: item.meta }),
      renderAction(item),
    ] }),
  }));
  const { aria: rootAria, ...rootNative } = attributes;
  const { aria: triggerAria, ...triggerNative } = triggerAttributes;
  const { aria: panelAria, ...panelNative } = panelAttributes;
  return q.section({
    ...rootNative,
    id,
    role: 'region',
    part: 'root',
    aria: { ...rootAria, label },
    class: [{ gluon: true, organism: true, 'gluon-notification-center': true }, attributes.class],
    'data-state': open ? 'open' : 'closed',
    'data-unread-count': unread,
    children: [
      q.button({
        ...triggerNative,
        id: `${id}-trigger`,
        type: 'button',
        part: 'trigger',
        aria: { ...triggerAria, label: triggerAria?.label ?? accessibleTriggerLabel, expanded: open, controls: panelId },
        class: [{ 'gluon-notification-center-trigger': true }, triggerAttributes.class],
        onClick: (event: MouseEvent) => onOpenChange?.(!open, event),
        children: [triggerLabel, unread > 0 ? q.span({ part: 'count', class: 'gluon-notification-center-count', aria: { label: `${unread} unread` }, children: unread }) : nothing],
      }),
      q.div({
        ...panelNative,
        id: panelId,
        role: 'region',
        part: 'panel',
        hidden: !open,
        aria: { ...panelAria, labelledby: headingId },
        class: [{ 'gluon-notification-center-panel': true }, panelAttributes.class],
        children: [
          q.header({ part: 'header', class: 'gluon-notification-center-header', children: q.h2({ id: headingId, children: heading ?? label }) }),
          notifications.length === 0
            ? q.p({ part: 'empty', class: 'gluon-notification-center-empty', children: emptyContent })
            : q.ul({ part: 'list', class: 'gluon-notification-center-list', children: list }),
        ],
      }),
    ],
  });
}

export const NotificationCenter = defineOrganism(renderNotificationCenter, 'NotificationCenter', [notificationCenterStyleDependency]);
