import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { disclosureStyleDependency } from './disclosure-styles.js';

export type DisclosureAttributes = Omit<QuarkProps<HTMLDetailsElement>, 'children' | 'open' | '.open'>;
export type DisclosureSummaryAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLElement>['aria']>, 'disabled' | 'describedby'>;
};
export type DisclosureState =
  | { readonly open: boolean; readonly defaultOpen?: never }
  | { readonly open?: never; readonly defaultOpen?: boolean };
export type DisclosureAvailability =
  | { readonly unavailable: true; readonly unavailableReason: string }
  | { readonly unavailable?: false; readonly unavailableReason?: never };

export type DisclosureProps = DisclosureState & DisclosureAvailability & {
  readonly id: string;
  readonly summary: TemplateValue;
  readonly children: TemplateValue;
  readonly onToggle?: (event: Event) => void;
  readonly attributes?: DisclosureAttributes;
  readonly summaryAttributes?: DisclosureSummaryAttributes;
  readonly contentAttributes?: Omit<QuarkProps<HTMLDivElement>, 'children'>;
};

function renderDisclosure({
  id,
  summary,
  children,
  open,
  defaultOpen = false,
  unavailable = false,
  unavailableReason,
  onToggle,
  attributes = {},
  summaryAttributes = {},
  contentAttributes = {},
}: DisclosureProps): TemplateResult {
  const reasonId = unavailable ? `${id}-unavailable` : undefined;
  const { '@toggle': attributeToggle, ...nativeAttributes } = attributes;
  const {
    aria: summaryAria,
    onClick: summaryClick,
    onKeydown: summaryKeydown,
    ...nativeSummaryAttributes
  } = summaryAttributes;
  const detailsProps: QuarkProps<HTMLDetailsElement> = {
    ...nativeAttributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-disclosure': true }, attributes.class],
    open: open ?? defaultOpen,
    data: { ...attributes.data, unavailable },
    '@toggle': (event: Event) => {
      callListener(attributeToggle, event);
      if (!event.defaultPrevented) onToggle?.(event);
    },
    children: [
      q.summary({
        ...nativeSummaryAttributes,
        class: [{ 'gluon-disclosure-summary': true }, summaryAttributes.class],
        aria: { ...summaryAria, disabled: unavailable || undefined, describedby: reasonId },
        onClick: (event: MouseEvent) => {
          callListener(summaryClick, event);
          if (unavailable && !event.defaultPrevented) event.preventDefault();
        },
        onKeydown: (event: KeyboardEvent) => {
          callListener(summaryKeydown, event);
          if (unavailable && !event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
        },
        children: [
          q.span({ class: 'gluon-disclosure-summary-label', children: summary }),
          unavailable ? q.span({ id: reasonId, class: 'gluon-disclosure-unavailable', children: unavailableReason }) : undefined,
        ],
      }),
      q.div({
        ...contentAttributes,
        class: [{ 'gluon-disclosure-content': true }, contentAttributes.class],
        children,
      }),
    ],
  };
  return q.details(detailsProps);
}

function callListener<EventType extends Event>(
  listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined,
  event: EventType,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const Disclosure = defineMolecule(renderDisclosure, 'Disclosure', [disclosureStyleDependency]);
