import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { splitPaneStyleDependency } from './split-pane-styles.js';

type SplitPaneAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type SplitPaneAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: SplitPaneAria };
export type SplitPaneRegionAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type SplitPaneOrientation = 'horizontal' | 'vertical';
export type SplitPaneOpenChangeEvent = KeyboardEvent | MouseEvent;

export interface SplitPaneProps {
  readonly id: string;
  readonly primary: TemplateValue;
  readonly secondary?: TemplateValue;
  readonly orientation?: SplitPaneOrientation;
  readonly secondaryCollapsed?: boolean;
  readonly secondaryLabel?: string;
  readonly collapseLabel?: string;
  readonly expandLabel?: string;
  readonly onSecondaryCollapsedChange?: (collapsed: boolean, event: SplitPaneOpenChangeEvent) => void;
  readonly attributes?: SplitPaneAttributes;
  readonly primaryAttributes?: SplitPaneRegionAttributes;
  readonly secondaryAttributes?: SplitPaneRegionAttributes;
}

function renderSplitPane({
  id,
  primary,
  secondary,
  orientation = 'horizontal',
  secondaryCollapsed = false,
  secondaryLabel = 'Secondary panel',
  collapseLabel = 'Collapse secondary panel',
  expandLabel = 'Expand secondary panel',
  onSecondaryCollapsedChange,
  attributes = {},
  primaryAttributes = {},
  secondaryAttributes = {},
}: SplitPaneProps): TemplateResult {
  assertDomId('SplitPane.id', id);
  assertNonEmpty('SplitPane.secondaryLabel', secondaryLabel);
  assertNonEmpty('SplitPane.collapseLabel', collapseLabel);
  assertNonEmpty('SplitPane.expandLabel', expandLabel);
  if (orientation !== 'horizontal' && orientation !== 'vertical') throw new TypeError('SplitPane.orientation must be horizontal or vertical.');

  const hasSecondary = hasContent(secondary);
  const secondaryId = `${id}-secondary`;
  const toggleId = `${id}-toggle`;
  const { aria: rootAria, ...rootNativeAttributes } = attributes;
  const { aria: primaryAria, ...primaryNativeAttributes } = primaryAttributes;
  const { aria: secondaryAria, ...secondaryNativeAttributes } = secondaryAttributes;

  return q.div({
    ...rootNativeAttributes,
    id,
    data: { ...attributes.data, splitPaneRoot: id, orientation },
    class: [{ gluon: true, organism: true, 'gluon-split-pane': true, [`is-${orientation}`]: true, 'is-secondary-collapsed': secondaryCollapsed }, attributes.class],
    aria: rootAria,
    children: [
      q.section({
        ...primaryNativeAttributes,
        class: [{ 'gluon-split-pane-primary': true }, primaryAttributes.class],
        aria: { ...primaryAria, label: primaryAria?.label ?? 'Primary panel' },
        children: primary,
      }),
      !hasSecondary ? nothing : q.aside({
        ...secondaryNativeAttributes,
        id: secondaryId,
        class: [{ 'gluon-split-pane-secondary': true }, secondaryAttributes.class],
        aria: { ...secondaryAria, label: secondaryAria?.label ?? secondaryLabel },
        children: [
          q.div({ class: 'gluon-split-pane-secondary-header', children: [
            q.span({ class: 'gluon-split-pane-secondary-label', children: secondaryLabel }),
            q.button({
              id: toggleId,
              type: 'button',
              class: 'gluon-split-pane-toggle',
              aria: { controls: secondaryId, expanded: secondaryCollapsed ? 'false' : 'true', label: secondaryCollapsed ? expandLabel : collapseLabel },
              onClick: (event: MouseEvent) => onSecondaryCollapsedChange?.(!secondaryCollapsed, event),
              children: secondaryCollapsed ? 'Expand' : 'Collapse',
            }),
          ] }),
          q.div({ class: 'gluon-split-pane-secondary-content', hidden: secondaryCollapsed, children: secondary }),
        ],
      }),
    ],
  });
}

export const SplitPane = defineOrganism(renderSplitPane, 'SplitPane', [splitPaneStyleDependency]);

function hasContent(value: TemplateValue | undefined): boolean { return value != null && value !== false && value !== nothing; }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
