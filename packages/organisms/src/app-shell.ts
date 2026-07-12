import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';

type AppShellAttributes = Omit<QuarkProps<HTMLDivElement>, 'children'>;

export interface AppShellProps {
  readonly header?: TemplateValue;
  readonly navigation?: TemplateValue;
  readonly children: TemplateValue;
  readonly footer?: TemplateValue;
  readonly attributes?: AppShellAttributes;
}

function renderAppShell({
  header,
  navigation,
  children,
  footer,
  attributes = {},
}: AppShellProps): TemplateResult {
  return q.div({
    ...attributes,
    class: [
      { gluon: true, organism: true, 'gluon-app-shell': true },
      attributes.class,
    ],
    children: [
      hasContent(header)
        ? q.header({ class: { 'gluon-app-shell-header': true }, children: header })
        : nothing,
      q.div({
        class: { 'gluon-app-shell-layout': true },
        children: [
          hasContent(navigation)
            ? q.nav({ class: { 'gluon-app-shell-navigation': true }, children: navigation })
            : nothing,
          q.main({ class: { 'gluon-app-shell-main': true }, children }),
        ],
      }),
      hasContent(footer)
        ? q.footer({ class: { 'gluon-app-shell-footer': true }, children: footer })
        : nothing,
    ],
  });
}

export const AppShell = defineOrganism(renderAppShell, 'AppShell');

function hasContent(value: TemplateValue | undefined): boolean {
  return value != null && value !== false && value !== nothing;
}
