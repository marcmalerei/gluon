import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import {
  Disclosure,
  type DisclosureAttributes,
  type DisclosureSummaryAttributes,
} from './disclosure.js';
import { accordionStyleDependency } from './accordion-styles.js';

export type AccordionAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };
export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;
export type AccordionAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby'>;
};

interface AccordionItemBase {
  readonly id: string;
  readonly value: string;
  readonly summary: TemplateValue;
  readonly children: TemplateValue;
  readonly attributes?: DisclosureAttributes;
  readonly summaryAttributes?: DisclosureSummaryAttributes;
  readonly contentAttributes?: Omit<QuarkProps<HTMLDivElement>, 'children'>;
}
export type AccordionItem = AccordionItemBase & (
  | { readonly unavailable?: false; readonly unavailableReason?: never }
  | { readonly unavailable: true; readonly unavailableReason: string }
);

export type AccordionChangeEvent = Event;
export type AccordionSingleProps = AccordionAccessibleName & {
  readonly mode?: 'single';
  readonly value?: string;
  readonly collapsible?: boolean;
  readonly onChange?: (value: string | undefined, event: AccordionChangeEvent) => void;
};
export type AccordionMultipleProps = AccordionAccessibleName & {
  readonly mode: 'multiple';
  readonly value: readonly string[];
  readonly collapsible?: never;
  readonly onChange?: (value: readonly string[], event: AccordionChangeEvent) => void;
};
export type AccordionProps = (AccordionSingleProps | AccordionMultipleProps) & {
  readonly items: readonly AccordionItem[];
  readonly headingLevel?: AccordionHeadingLevel;
  readonly attributes?: AccordionAttributes;
};

function renderAccordion({
  label,
  labelledBy,
  items,
  headingLevel = 3,
  attributes = {},
  ...state
}: AccordionProps): TemplateResult {
  const { aria, ...nativeAttributes } = attributes;
  const mode = state.mode ?? 'single';
  const selected = new Set(mode === 'multiple' ? state.value : state.value ? [state.value] : []);
  return q.div({
    ...nativeAttributes,
    role: 'group',
    class: [{ gluon: true, molecule: true, 'gluon-accordion': true }, attributes.class],
    data: { ...attributes.data, mode },
    aria: { ...aria, label, labelledby: labelledBy },
    children: items.map((item) => Disclosure({
      id: item.id,
      summary: q.span({
        role: 'heading',
        class: 'gluon-accordion-heading',
        aria: { level: headingLevel },
        children: item.summary,
      }),
      open: selected.has(item.value),
      ...(item.unavailable
        ? { unavailable: true as const, unavailableReason: item.unavailableReason }
        : { unavailable: false as const }),
      attributes: item.attributes,
      summaryAttributes: {
        ...item.summaryAttributes,
        data: { ...item.summaryAttributes?.data, accordionSummary: true, value: item.value },
        onKeydown: (event: KeyboardEvent) => {
          callKeydown(item.summaryAttributes?.onKeydown, event);
          if (!event.defaultPrevented) moveSummaryFocus(event);
        },
      },
      contentAttributes: item.contentAttributes,
      onToggle: (event) => {
        const details = event.currentTarget as HTMLDetailsElement;
        const expectedOpen = selected.has(item.value);
        if (details.open === expectedOpen) return;
        if (state.mode === 'multiple') {
          const next = new Set(state.value);
          if (details.open) next.add(item.value);
          else next.delete(item.value);
          state.onChange?.([...next], event);
          return;
        }
        if (!details.open && state.collapsible === false) {
          details.open = true;
          return;
        }
        state.onChange?.(details.open ? item.value : undefined, event);
      },
      children: item.children,
    })),
  });
}

function moveSummaryFocus(event: KeyboardEvent): void {
  const current = event.currentTarget as HTMLElement;
  const accordion = current.closest<HTMLElement>('.gluon-accordion');
  if (!accordion) return;
  const summaries = [...accordion.querySelectorAll<HTMLElement>(
    'summary[data-accordion-summary]:not([aria-disabled="true"])',
  )];
  const index = summaries.indexOf(current);
  if (index < 0 || summaries.length === 0) return;
  let target: HTMLElement | undefined;
  if (event.key === 'ArrowUp') target = summaries[(index - 1 + summaries.length) % summaries.length];
  else if (event.key === 'ArrowDown') target = summaries[(index + 1) % summaries.length];
  else if (event.key === 'Home') target = summaries[0];
  else if (event.key === 'End') target = summaries.at(-1);
  if (!target) return;
  event.preventDefault();
  target.focus();
}

function callKeydown(
  listener: ((event: KeyboardEvent) => unknown) | { handleEvent(event: KeyboardEvent): void } | null | undefined,
  event: KeyboardEvent,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const Accordion = defineMolecule(renderAccordion, 'Accordion', [accordionStyleDependency]);
