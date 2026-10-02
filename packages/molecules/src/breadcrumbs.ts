import { defineMolecule, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { breadcrumbsStyleDependency } from './breadcrumbs-styles.js';

export type BreadcrumbsAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'aria-label'>;
export type BreadcrumbItemAttributes = Omit<QuarkProps<HTMLLIElement>, 'children'>;
export type BreadcrumbLinkAttributes = Omit<QuarkProps<HTMLAnchorElement>, 'children' | 'href' | 'aria-current'>;

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
  readonly current?: boolean;
  readonly attributes?: BreadcrumbItemAttributes;
  readonly linkAttributes?: BreadcrumbLinkAttributes;
}

export interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
  readonly label?: string;
  readonly attributes?: BreadcrumbsAttributes;
}

function renderBreadcrumbs({ items, label = 'Breadcrumb', attributes = {} }: BreadcrumbsProps): TemplateResult {
  let currentIndex = items.length - 1;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index]?.current === true) { currentIndex = index; break; }
  }

  return q.nav({
    ...attributes,
    class: [{ gluon: true, molecule: true, 'gluon-breadcrumbs': true }, attributes.class],
    'aria-label': label,
    children: q.ol({
      class: { 'gluon-breadcrumbs-list': true },
      children: items.map((item, index) => {
        const current = index === currentIndex;
        return q.li({
          ...item.attributes,
          class: [{ 'gluon-breadcrumbs-item': true }, item.attributes?.class],
          children: current || !item.href
              ? q.span({
                class: { 'gluon-breadcrumbs-current': current },
                aria: { current: current ? 'page' : undefined },
                children: item.label,
              })
            : q.a({
                ...item.linkAttributes,
                class: [{ 'gluon-breadcrumbs-link': true }, item.linkAttributes?.class],
                href: item.href,
                children: item.label,
              }),
        });
      }),
    }),
  });
}

export const Breadcrumbs = defineMolecule(renderBreadcrumbs, 'Breadcrumbs', [breadcrumbsStyleDependency]);
