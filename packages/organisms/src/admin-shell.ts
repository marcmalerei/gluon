import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { adminShellStyleDependency } from './admin-shell-styles.js';

type AdminShellAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type AdminShellRegionAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: AdminShellAria;
};
export type AdminShellNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']>;
};

export type AdminShellAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: AdminShellAria;
};

export interface AdminShellProps {
  readonly id: string;
  readonly header?: TemplateValue;
  readonly sidebar?: TemplateValue;
  readonly main: TemplateValue;
  readonly footer?: TemplateValue;
  readonly sidebarLabel?: string;
  readonly attributes?: AdminShellAttributes;
  readonly headerAttributes?: AdminShellRegionAttributes;
  readonly sidebarAttributes?: AdminShellRegionAttributes;
  readonly navigationAttributes?: AdminShellNavigationAttributes;
  readonly mainAttributes?: AdminShellRegionAttributes;
  readonly footerAttributes?: AdminShellRegionAttributes;
}

function renderAdminShell({
  id,
  header,
  sidebar,
  main,
  footer,
  sidebarLabel = 'Administration navigation',
  attributes = {},
  headerAttributes = {},
  sidebarAttributes = {},
  navigationAttributes = {},
  mainAttributes = {},
  footerAttributes = {},
}: AdminShellProps): TemplateResult {
  assertDomId('AdminShell.id', id);
  assertNonEmpty('AdminShell.sidebarLabel', sidebarLabel);
  const { aria: rootAria, ...rootNativeAttributes } = attributes;
  const { aria: sidebarAria, ...sidebarNativeAttributes } = sidebarAttributes;
  const { aria: navigationAria, ...navigationNativeAttributes } = navigationAttributes;

  return q.div({
    ...rootNativeAttributes,
    id,
    data: { ...attributes.data, adminShellRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-admin-shell': true }, attributes.class],
    aria: rootAria,
    children: [
      hasContent(header)
        ? q.header({
          ...headerAttributes,
          class: [{ 'gluon-admin-shell-header': true }, headerAttributes.class],
          children: header,
        })
        : nothing,
      q.div({
        class: 'gluon-admin-shell-layout',
        children: [
          hasContent(sidebar)
            ? q.aside({
              ...sidebarNativeAttributes,
              class: [{ 'gluon-admin-shell-sidebar': true }, sidebarAttributes.class],
              aria: sidebarAria,
              children: q.nav({
                ...navigationNativeAttributes,
                class: 'gluon-admin-shell-navigation',
                aria: { ...navigationAria, label: navigationAria?.label ?? sidebarLabel },
                children: sidebar,
              }),
            })
            : nothing,
          q.main({
            ...mainAttributes,
            class: [{ 'gluon-admin-shell-main': true }, mainAttributes.class],
            children: main,
          }),
        ],
      }),
      hasContent(footer)
        ? q.footer({
          ...footerAttributes,
          class: [{ 'gluon-admin-shell-footer': true }, footerAttributes.class],
          children: footer,
        })
        : nothing,
    ],
  });
}

export const AdminShell = defineOrganism(renderAdminShell, 'AdminShell', [adminShellStyleDependency]);

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
