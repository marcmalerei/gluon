import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { tableRegionStyleDependency } from './table-region-styles.js';

export type TableRegionAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };
export type TableRegionAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby' | 'describedby'>;
};
export type TableRegionContent =
  | { readonly empty: true; readonly emptyContent: TemplateValue; readonly children?: never }
  | { readonly empty?: false; readonly emptyContent?: never; readonly children: TemplateValue };
export type TableRegionProps = TableRegionAccessibleName & TableRegionContent & {
  readonly id: string;
  readonly summary?: TemplateValue;
  readonly scrollHint?: TemplateValue;
  readonly attributes?: TableRegionAttributes;
};

function renderTableRegion({
  id,
  label,
  labelledBy,
  summary,
  scrollHint,
  empty = false,
  emptyContent,
  children,
  attributes = {},
}: TableRegionProps): TemplateResult {
  const summaryId = summary === undefined ? undefined : `${id}-summary`;
  const hintId = scrollHint === undefined ? undefined : `${id}-scroll-hint`;
  const controller = createTableRegionController();
  const externalRef = attributes.ref;
  const { aria, ...nativeAttributes } = attributes;
  return q.div({
    ...nativeAttributes,
    id,
    role: 'region',
    class: [{ gluon: true, molecule: true, 'gluon-table-region': true }, attributes.class],
    data: { ...attributes.data, empty },
    aria: { ...aria, label, labelledby: labelledBy, describedby: summaryId },
    ref: (element) => {
      controller.rootRef(element);
      assignRef(externalRef, element);
    },
    children: [
      summary === undefined ? undefined : q.p({ id: summaryId, class: 'gluon-table-region-summary', children: summary }),
      empty
        ? q.div({ class: 'gluon-table-region-empty', children: emptyContent })
        : [
            scrollHint === undefined ? undefined : q.p({ id: hintId, class: 'gluon-table-region-scroll-hint', hidden: true, children: scrollHint }),
            q.div({ class: 'gluon-table-region-viewport', tabIndex: -1, aria: { describedby: hintId }, children: q.div({ class: 'gluon-table-region-content', children }) }),
          ],
    ],
  });
}

interface TableRegionController {
  readonly rootRef: (element: HTMLDivElement | undefined) => void;
}

function createTableRegionController(): TableRegionController {
  let root: HTMLDivElement | undefined;
  let viewport: HTMLElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;
  let generation = 0;
  let scheduled = false;

  const disconnect = (): void => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    resizeObserver = undefined;
    mutationObserver = undefined;
    viewport = undefined;
  };

  const update = (): void => {
    if (!root || !viewport) return;
    const overflowing = viewport.scrollWidth - viewport.clientWidth > 1;
    root.toggleAttribute('data-overflow', overflowing);
    viewport.tabIndex = overflowing ? 0 : -1;
    const hint = root.querySelector<HTMLElement>('.gluon-table-region-scroll-hint');
    if (hint) hint.hidden = !overflowing;
  };

  const connect = (): void => {
    if (!root) return;
    const nextViewport = root.querySelector<HTMLElement>('.gluon-table-region-viewport');
    if (!nextViewport || nextViewport === viewport) return;
    disconnect();
    viewport = nextViewport;
    const view = root.ownerDocument.defaultView;
    if (!view) return;
    if (typeof view.ResizeObserver === 'function') {
      resizeObserver = new view.ResizeObserver(schedule);
      resizeObserver.observe(viewport);
      const content = viewport.querySelector<HTMLElement>('.gluon-table-region-content');
      if (content) resizeObserver.observe(content);
    }
    if (typeof view.MutationObserver === 'function') {
      mutationObserver = new view.MutationObserver(schedule);
      mutationObserver.observe(viewport, { childList: true, subtree: true });
    }
  };

  const flush = (scheduledGeneration: number): void => {
    scheduled = false;
    if (!root || generation !== scheduledGeneration) return;
    connect();
    update();
  };

  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    const scheduledGeneration = generation;
    queueMicrotask(() => flush(scheduledGeneration));
  }

  const onResize = (): void => schedule();

  return {
    rootRef(element) {
      if (element === root) return;
      root?.ownerDocument.defaultView?.removeEventListener('resize', onResize);
      disconnect();
      root = element;
      generation += 1;
      scheduled = false;
      root?.ownerDocument.defaultView?.addEventListener('resize', onResize);
      if (root) schedule();
    },
  };
}

function assignRef(ref: QuarkRef<HTMLDivElement> | undefined, element: HTMLDivElement | undefined): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

export const TableRegion = defineMolecule(renderTableRegion, 'TableRegion', [tableRegionStyleDependency]);
