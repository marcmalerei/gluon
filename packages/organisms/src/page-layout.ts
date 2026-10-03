import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { pageLayoutStyleDependency } from './page-layout-styles.js';

type PageLayoutAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type PageLayoutAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: PageLayoutAria };
export type PageLayoutRegionAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };

export type PageLayoutHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface PageLayoutProps {
  readonly id: string;
  readonly title: TemplateValue;
  readonly children: TemplateValue;
  readonly breadcrumbs?: TemplateValue;
  readonly actions?: TemplateValue;
  readonly aside?: TemplateValue;
  readonly footer?: TemplateValue;
  readonly headingLevel?: PageLayoutHeadingLevel;
  readonly asideLabel?: string;
  readonly attributes?: PageLayoutAttributes;
  readonly headerAttributes?: PageLayoutRegionAttributes;
  readonly mainAttributes?: PageLayoutRegionAttributes;
  readonly asideAttributes?: PageLayoutRegionAttributes;
  readonly footerAttributes?: PageLayoutRegionAttributes;
}

function renderPageLayout({
  id,
  title,
  children,
  breadcrumbs,
  actions,
  aside,
  footer,
  headingLevel = 1,
  asideLabel = 'Related content',
  attributes = {},
  headerAttributes = {},
  mainAttributes = {},
  asideAttributes = {},
  footerAttributes = {},
}: PageLayoutProps): TemplateResult {
  assertDomId('PageLayout.id', id);
  assertNonEmpty('PageLayout.asideLabel', asideLabel);
  const { aria: rootAria, ...rootNativeAttributes } = attributes;
  const { aria: headerAria, ...headerNativeAttributes } = headerAttributes;
  const { aria: mainAria, ...mainNativeAttributes } = mainAttributes;
  const { aria: asideAria, ...asideNativeAttributes } = asideAttributes;
  const { aria: footerAria, ...footerNativeAttributes } = footerAttributes;
  const heading = renderHeading(headingLevel, { id: `${id}-title`, children: title });

  return q.div({
    ...rootNativeAttributes,
    id,
    data: { ...attributes.data, pageLayoutRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-page-layout': true }, attributes.class],
    aria: rootAria,
    children: [
      q.header({
        ...headerNativeAttributes,
        class: [{ 'gluon-page-layout-header': true }, headerAttributes.class],
        aria: headerAria,
        children: [
          hasContent(breadcrumbs) ? q.div({ class: 'gluon-page-layout-breadcrumbs', children: breadcrumbs }) : nothing,
          q.div({ class: 'gluon-page-layout-heading-row', children: [heading, hasContent(actions) ? q.div({ class: 'gluon-page-layout-actions', children: actions }) : nothing] }),
        ],
      }),
      q.div({ class: 'gluon-page-layout-body', children: [
        q.main({
          ...mainNativeAttributes,
          id: `${id}-main`,
          class: [{ 'gluon-page-layout-main': true }, mainAttributes.class],
          aria: { ...mainAria, labelledby: mainAria?.labelledby ?? `${id}-title` },
          children,
        }),
        hasContent(aside) ? q.aside({
          ...asideNativeAttributes,
          id: `${id}-aside`,
          class: [{ 'gluon-page-layout-aside': true }, asideAttributes.class],
          aria: { ...asideAria, label: asideAria?.label ?? asideLabel },
          children: aside,
        }) : nothing,
      ] }),
      hasContent(footer) ? q.footer({
        ...footerNativeAttributes,
        class: [{ 'gluon-page-layout-footer': true }, footerAttributes.class],
        aria: footerAria,
        children: footer,
      }) : nothing,
    ],
  });
}

export const PageLayout = defineOrganism(renderPageLayout, 'PageLayout', [pageLayoutStyleDependency]);

function renderHeading(level: PageLayoutHeadingLevel, props: { readonly id: string; readonly children: TemplateValue }): TemplateValue {
  if (level === 1) return q.h1(props);
  if (level === 2) return q.h2(props);
  if (level === 3) return q.h3(props);
  if (level === 4) return q.h4(props);
  if (level === 5) return q.h5(props);
  return q.h6(props);
}

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
