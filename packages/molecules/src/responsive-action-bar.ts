import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { responsiveActionBarStyleDependency } from './responsive-action-bar-styles.js';

export type ResponsiveActionBarState = 'ready' | 'loading' | 'disabled' | 'error';
export type ResponsiveActionBarPresentation = 'sticky' | 'inline';
export type ResponsiveActionBarAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLElement>['aria']>, 'live' | 'atomic' | 'busy' | 'disabled'>;
};

export interface ResponsiveActionBarProps {
  readonly summary: TemplateValue;
  readonly status?: TemplateValue;
  readonly primaryAction: TemplateValue;
  readonly compactControl?: TemplateValue;
  readonly state?: ResponsiveActionBarState;
  readonly presentation?: ResponsiveActionBarPresentation;
  readonly attributes?: ResponsiveActionBarAttributes;
}

function renderResponsiveActionBar({
  summary,
  status,
  primaryAction,
  compactControl,
  state = 'ready',
  presentation = 'sticky',
  attributes = {},
}: ResponsiveActionBarProps): TemplateResult {
  assertState(state);
  assertPresentation(presentation);
  const { aria, ...nativeAttributes } = attributes;
  const liveRole = state === 'error' ? 'alert' : status === undefined ? undefined : 'status';
  const live = state === 'error' ? 'assertive' : 'polite';
  return q.section({
    ...nativeAttributes,
    class: [{ gluon: true, molecule: true, 'gluon-responsive-action-bar': true, [`is-${presentation}`]: true }, attributes.class],
    data: { ...attributes.data, state, presentation },
    aria: { ...aria, busy: state === 'loading', disabled: state === 'disabled' || undefined },
    children: [
      q.div({ class: 'gluon-responsive-action-bar-summary', children: summary }),
      status === undefined ? undefined : q.div({ class: 'gluon-responsive-action-bar-status', role: liveRole, aria: liveRole ? { live, atomic: true } : undefined, children: status }),
      compactControl === undefined ? undefined : q.div({ class: 'gluon-responsive-action-bar-compact', children: compactControl }),
      q.div({ class: 'gluon-responsive-action-bar-action', children: primaryAction }),
    ],
  });
}

function assertState(value: ResponsiveActionBarState): void {
  if (value !== 'ready' && value !== 'loading' && value !== 'disabled' && value !== 'error') {
    throw new RangeError(`ResponsiveActionBar state must be ready, loading, disabled, or error; received ${String(value)}.`);
  }
}

function assertPresentation(value: ResponsiveActionBarPresentation): void {
  if (value !== 'sticky' && value !== 'inline') {
    throw new RangeError(`ResponsiveActionBar presentation must be sticky or inline; received ${String(value)}.`);
  }
}

export const ResponsiveActionBar = defineMolecule(renderResponsiveActionBar, 'ResponsiveActionBar', [responsiveActionBarStyleDependency]);
