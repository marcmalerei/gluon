import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { asyncStateStyleDependency } from './async-state-styles.js';

export type AsyncStateStatus = 'loading' | 'success' | 'empty' | 'error' | 'partial';
export type AsyncStateHeadingLevel = 2 | 3 | 4 | 5 | 6;
export type AsyncStateAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id'>;

export interface AsyncStateMessages {
  readonly loading?: string;
  readonly success?: string;
  readonly empty?: string;
  readonly error?: string;
  readonly partial?: string;
}

export interface AsyncStateProps {
  readonly id: string;
  readonly status: AsyncStateStatus;
  readonly heading: TemplateValue;
  readonly headingLevel?: AsyncStateHeadingLevel;
  readonly children?: TemplateValue;
  readonly loadingContent?: TemplateValue;
  readonly emptyContent?: TemplateValue;
  readonly errorContent?: TemplateValue;
  readonly partialContent?: TemplateValue;
  readonly actions?: TemplateValue;
  readonly message?: string;
  readonly messages?: AsyncStateMessages;
  readonly attributes?: AsyncStateAttributes;
}

const defaultMessages: Readonly<Record<AsyncStateStatus, string>> = Object.freeze({
  loading: 'Loading content',
  success: 'Content loaded',
  empty: 'No content',
  error: 'Content failed to load',
  partial: 'Content partially loaded',
});

function safeId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function heading(level: AsyncStateHeadingLevel, props: { readonly id: string; readonly children: TemplateValue }): TemplateValue {
  const headingProps = { id: props.id, children: props.children as NonNullable<Parameters<typeof q.h2>[0]>['children'] };
  switch (level) {
    case 2: return q.h2(headingProps);
    case 3: return q.h3(headingProps);
    case 4: return q.h4(headingProps);
    case 5: return q.h5(headingProps);
    case 6: return q.h6(headingProps);
  }
}

function renderAsyncState({ id, status, heading: title, headingLevel = 2, children, loadingContent, emptyContent, errorContent, partialContent, actions, message, messages = {}, attributes = {} }: AsyncStateProps): TemplateResult {
  const rootId = safeId(id) || 'async-state';
  const headingId = `${rootId}-heading`;
  const messageId = `${rootId}-message`;
  const resolvedMessage = message ?? messages[status] ?? defaultMessages[status];
  const stateContent = status === 'loading'
    ? loadingContent
    : status === 'empty'
      ? emptyContent
      : status === 'error'
        ? errorContent
        : status === 'partial'
          ? partialContent ?? children
          : children;
  const role = status === 'error' ? 'alert' : status === 'loading' || status === 'partial' ? 'status' : undefined;
  return q.section({
    ...attributes,
    id: rootId,
    part: 'root',
    class: [{ gluon: true, organism: true, 'gluon-async-state': true }, attributes.class],
    'data-state': status,
    'aria-labelledby': headingId,
    'aria-describedby': messageId,
    children: [
      heading(headingLevel, { id: headingId, children: title }),
      q.p({ id: messageId, class: { 'gluon-async-state-message': true }, part: 'message', role, aria: role ? { live: role === 'alert' ? 'assertive' : 'polite', atomic: true } : undefined, children: resolvedMessage }),
      stateContent === undefined ? nothing : q.div({ class: { 'gluon-async-state-content': true }, part: 'content', children: stateContent }),
      actions === undefined ? nothing : q.div({ class: { 'gluon-async-state-actions': true }, part: 'actions', children: actions }),
    ],
  });
}

export const AsyncState = defineOrganism(renderAsyncState, 'AsyncState', [asyncStateStyleDependency]);
