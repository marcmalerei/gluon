import { defineMolecule, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { paginationStyleDependency } from './pagination-styles.js';

export type PaginationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'aria-label'>;
export type PaginationLinkAttributes = Omit<QuarkProps<HTMLAnchorElement>, 'children' | 'href' | 'aria-current'>;

export interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly getPageHref: (page: number) => string;
  readonly label?: string;
  readonly siblingCount?: number;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
  readonly pageLabel?: (page: number) => string;
  readonly linkAttributes?: PaginationLinkAttributes;
  readonly attributes?: PaginationAttributes;
}

function renderPagination({
  currentPage,
  totalPages,
  getPageHref,
  label = 'Pagination',
  siblingCount = 1,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  pageLabel = (page) => `Page ${page}`,
  linkAttributes = {},
  attributes = {},
}: PaginationProps): TemplateResult {
  const lastPage = Math.max(0, Math.floor(totalPages));
  const page = clamp(Math.floor(currentPage), 1, lastPage);
  const pages = createPageRange(page, lastPage, Math.max(0, Math.floor(siblingCount)));
  const items = [
    renderBoundaryLink(page > 1, previousLabel, page - 1, getPageHref, linkAttributes, 'previous'),
    ...pages.map((entry) => entry === 'ellipsis'
      ? q.li({ class: { 'gluon-pagination-ellipsis': true }, aria: { hidden: true }, children: '…' })
      : q.li({
          class: { 'gluon-pagination-item': true },
          children: q.a({
            ...linkAttributes,
            class: [{ 'gluon-pagination-link': true, 'is-current': entry === page }, linkAttributes.class],
            href: getPageHref(entry),
            aria: { ...linkAttributes.aria, current: entry === page ? 'page' : undefined, label: pageLabel(entry) },
            children: String(entry),
          }),
        })),
    renderBoundaryLink(page < lastPage, nextLabel, page + 1, getPageHref, linkAttributes, 'next'),
  ];

  return q.nav({
    ...attributes,
    class: [{ gluon: true, molecule: true, 'gluon-pagination': true }, attributes.class],
    'aria-label': label,
    children: q.ul({ class: { 'gluon-pagination-list': true }, children: items }),
  });
}

function renderBoundaryLink(
  enabled: boolean,
  label: string,
  page: number,
  getPageHref: (page: number) => string,
  linkAttributes: PaginationLinkAttributes,
  direction: 'previous' | 'next',
) {
  return q.li({
    class: { 'gluon-pagination-item': true, [`is-${direction}`]: true },
    children: enabled
      ? q.a({ ...linkAttributes, class: [{ 'gluon-pagination-link': true }, linkAttributes.class], href: getPageHref(page), aria: { ...linkAttributes.aria, label }, children: direction === 'previous' ? '‹' : '›' })
      : q.span({ class: { 'gluon-pagination-link': true, 'is-disabled': true }, aria: { disabled: true, label }, children: direction === 'previous' ? '‹' : '›' }),
  });
}

function createPageRange(current: number, total: number, siblingCount: number): readonly (number | 'ellipsis')[] {
  if (total === 0) return [];
  const visible = new Set<number>([1, total]);
  for (let page = current - siblingCount; page <= current + siblingCount; page += 1) if (page > 0 && page <= total) visible.add(page);
  const ordered = [...visible].sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  ordered.forEach((item, index) => { const previous = ordered[index - 1]; if (previous !== undefined && item - previous > 1) result.push('ellipsis'); result.push(item); });
  return result;
}

function clamp(value: number, minimum: number, maximum: number): number { return maximum < minimum ? 0 : Math.min(maximum, Math.max(minimum, value)); }

export const Pagination = defineMolecule(renderPagination, 'Pagination', [paginationStyleDependency]);
