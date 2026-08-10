import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { inlineNoticeStyleDependency } from './inline-notice-styles.js';

export type InlineNoticeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type InlineNoticeAnnouncement = 'auto' | 'polite' | 'assertive' | 'off';
export type InlineNoticeAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'live' | 'atomic'>;
};

export interface InlineNoticeProps {
  readonly children: TemplateValue;
  readonly title?: TemplateValue;
  readonly tone?: InlineNoticeTone;
  readonly announcement?: InlineNoticeAnnouncement;
  readonly action?: TemplateValue;
  readonly dismissAction?: TemplateValue;
  readonly attributes?: InlineNoticeAttributes;
}

const markers: Readonly<Record<InlineNoticeTone, string>> = Object.freeze({
  neutral: 'i',
  info: 'i',
  success: '✓',
  warning: '!',
  danger: '×',
});

function renderInlineNotice({
  children,
  title,
  tone = 'neutral',
  announcement = 'auto',
  action,
  dismissAction,
  attributes = {},
}: InlineNoticeProps): TemplateResult {
  const resolvedAnnouncement = announcement === 'auto'
    ? autoAnnouncement(tone)
    : announcement;
  const role = resolvedAnnouncement === 'assertive'
    ? 'alert'
    : resolvedAnnouncement === 'polite'
      ? 'status'
      : undefined;
  const { aria, ...nativeAttributes } = attributes;
  return q.div({
    ...nativeAttributes,
    class: [{ gluon: true, molecule: true, 'gluon-inline-notice': true, [`is-${tone}`]: true }, attributes.class],
    data: { ...attributes.data, tone, announcement: resolvedAnnouncement },
    aria,
    children: [
      q.span({ class: 'gluon-inline-notice-marker', aria: { hidden: true }, children: markers[tone] }),
      q.div({
        class: 'gluon-inline-notice-announcement',
        role,
        aria: role ? { live: resolvedAnnouncement, atomic: true } : undefined,
        children: [
          title === undefined ? undefined : q.strong({ class: 'gluon-inline-notice-title', children: title }),
          q.div({ class: 'gluon-inline-notice-body', children }),
        ],
      }),
      action === undefined && dismissAction === undefined
        ? undefined
        : q.div({ class: 'gluon-inline-notice-actions', children: [action, dismissAction] }),
    ],
  });
}

function autoAnnouncement(tone: InlineNoticeTone): Exclude<InlineNoticeAnnouncement, 'auto'> {
  if (tone === 'danger' || tone === 'warning') return 'assertive';
  if (tone === 'info' || tone === 'success') return 'polite';
  return 'off';
}

export const InlineNotice = defineMolecule(renderInlineNotice, 'InlineNotice', [inlineNoticeStyleDependency]);
