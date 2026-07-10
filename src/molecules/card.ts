import { defineMolecule } from '../component.js';
import { nothing, type TemplateResult, type TemplateValue } from '../runtime.js';
import { q, type QuarkProps } from '../quarks/index.js';

export type CardTone = 'default' | 'success' | 'warning' | 'danger';

export interface CardProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly tone?: CardTone;
  readonly actions?: TemplateValue;
  readonly media?: TemplateValue;
  readonly children?: TemplateValue;
  readonly attributes?: QuarkProps<HTMLElement>;
}

function renderCard({
  title,
  subtitle,
  tone = 'default',
  actions,
  media,
  children,
  attributes = {},
}: CardProps): TemplateResult {
  const header = title || subtitle || hasContent(actions)
    ? q.div({
        class: { 'gluon-card-header': true },
        children: [
          q.div({
            class: { 'gluon-card-heading': true },
            children: [
              title ? q.h3({ class: { 'gluon-card-title': true }, children: title }) : nothing,
              subtitle ? q.p({ class: { 'gluon-card-subtitle': true }, children: subtitle }) : nothing,
            ],
          }),
          hasContent(actions)
            ? q.div({ class: { 'gluon-card-actions': true }, children: actions })
            : nothing,
        ],
      })
    : nothing;

  return q.article({
    ...attributes,
    class: [
      {
        gluon: true,
        molecule: true,
        'gluon-card': true,
        [`is-${tone}`]: tone !== 'default',
      },
      attributes.class,
    ],
    children: [
      hasContent(media)
        ? q.div({ class: { 'gluon-card-media': true }, children: media })
        : nothing,
      header,
      hasContent(children)
        ? q.div({ class: { 'gluon-card-body': true }, children })
        : nothing,
    ],
  });
}

export const Card = defineMolecule(renderCard, 'Card');

function hasContent(value: TemplateValue | undefined): boolean {
  return value != null && value !== false && value !== nothing;
}
