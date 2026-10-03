import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { siteFooterStyleDependency } from './site-footer-styles.js';

type SiteFooterAria = NonNullable<QuarkProps<HTMLElement>['aria']>;
type SiteFooterDivAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;

export type SiteFooterAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: SiteFooterAria;
};

export type SiteFooterRegionAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: SiteFooterDivAria;
};

export type SiteFooterNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: SiteFooterAria;
};

export interface SiteFooterProps {
  readonly id: string;
  readonly brand?: TemplateValue;
  readonly navigation?: TemplateValue;
  readonly legal?: TemplateValue;
  readonly meta?: TemplateValue;
  readonly navigationLabel?: string;
  readonly brandAttributes?: SiteFooterRegionAttributes;
  readonly navigationAttributes?: SiteFooterNavigationAttributes;
  readonly legalAttributes?: SiteFooterRegionAttributes;
  readonly metaAttributes?: SiteFooterRegionAttributes;
  readonly attributes?: SiteFooterAttributes;
}

function renderSiteFooter({
  id,
  brand,
  navigation,
  legal,
  meta,
  navigationLabel = 'Footer navigation',
  brandAttributes = {},
  navigationAttributes = {},
  legalAttributes = {},
  metaAttributes = {},
  attributes = {},
}: SiteFooterProps): TemplateResult {
  assertDomId('SiteFooter.id', id);
  assertNonEmpty('SiteFooter.navigationLabel', navigationLabel);
  const { aria: rootAria, ...nativeAttributes } = attributes;
  const { aria: navigationAria, ...nativeNavigationAttributes } = navigationAttributes;

  return q.footer({
    ...nativeAttributes,
    id,
    data: { ...attributes.data, siteFooterRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-site-footer': true }, attributes.class],
    aria: rootAria,
    children: [
      q.div({
        class: 'gluon-site-footer-inner',
        children: [
          hasContent(brand)
            ? q.div({
              ...brandAttributes,
              class: [{ 'gluon-site-footer-brand': true }, brandAttributes.class],
              children: brand,
            })
            : nothing,
          hasContent(navigation)
            ? q.nav({
              ...nativeNavigationAttributes,
              class: [{ 'gluon-site-footer-navigation': true }, navigationAttributes.class],
              aria: { ...navigationAria, label: navigationAria?.label ?? navigationLabel },
              children: navigation,
            })
            : nothing,
          hasContent(legal)
            ? q.div({
              ...legalAttributes,
              class: [{ 'gluon-site-footer-legal': true }, legalAttributes.class],
              children: legal,
            })
            : nothing,
          hasContent(meta)
            ? q.div({
              ...metaAttributes,
              class: [{ 'gluon-site-footer-meta': true }, metaAttributes.class],
              children: meta,
            })
            : nothing,
        ],
      }),
    ],
  });
}

export const SiteFooter = defineOrganism(renderSiteFooter, 'SiteFooter', [siteFooterStyleDependency]);

function hasContent(value: TemplateValue | undefined): boolean {
  return value != null && value !== false && value !== nothing;
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}
