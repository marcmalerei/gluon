import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { navigationStripStyleDependency } from './navigation-strip-styles.js';

type NavigationStripAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'aria-label'>;

export interface NavigationStripProps {
  /** Accessible name for the native navigation landmark. */
  readonly label: string;
  /** Navigation destinations rendered in source and keyboard order. */
  readonly children?: TemplateValue;
  /** Accessible name for the control that reveals earlier destinations. */
  readonly previousLabel?: string;
  /** Accessible name for the control that reveals later destinations. */
  readonly nextLabel?: string;
  /** Native attributes applied to the navigation landmark. */
  readonly attributes?: NavigationStripAttributes;
}

interface NavigationStripController {
  readonly rootRef: (element: HTMLElement | undefined) => void;
  readonly onControlBlur: () => void;
  readonly onScroll: () => void;
  scroll(direction: -1 | 1): void;
}

function renderNavigationStrip({
  label,
  children,
  previousLabel = 'Show previous navigation items',
  nextLabel = 'Show more navigation items',
  attributes = {},
}: NavigationStripProps): TemplateResult {
  const controller = createNavigationStripController();
  const externalRef = attributes.ref;

  return q.nav({
    ...attributes,
    class: [
      { gluon: true, molecule: true, 'gluon-navigation-strip': true },
      attributes.class,
    ],
    'aria-label': label,
    ref: (element) => {
      controller.rootRef(element);
      assignRef(externalRef, element);
    },
    children: [
      q.button({
        class: { 'gluon-navigation-strip-control': true, 'is-previous': true },
        type: 'button',
        hidden: true,
        disabled: true,
        aria: { label: previousLabel },
        onBlur: controller.onControlBlur,
        onClick: () => controller.scroll(-1),
        children: q.span({
          class: { 'gluon-navigation-strip-control-glyph': true },
          aria: { hidden: true },
          children: '‹',
        }),
      }),
      q.div({
        class: { 'gluon-navigation-strip-viewport': true },
        tabIndex: -1,
        '@scroll': controller.onScroll,
        children: q.div({
          class: { 'gluon-navigation-strip-content': true },
          children,
        }),
      }),
      q.button({
        class: { 'gluon-navigation-strip-control': true, 'is-next': true },
        type: 'button',
        hidden: true,
        disabled: true,
        aria: { label: nextLabel },
        onBlur: controller.onControlBlur,
        onClick: () => controller.scroll(1),
        children: q.span({
          class: { 'gluon-navigation-strip-control-glyph': true },
          aria: { hidden: true },
          children: '›',
        }),
      }),
    ],
  });
}

export const NavigationStrip = defineMolecule(
  renderNavigationStrip,
  'NavigationStrip',
  [navigationStripStyleDependency],
);

function createNavigationStripController(): NavigationStripController {
  let root: HTMLElement | undefined;
  let viewport: HTMLElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;
  let scheduled = false;
  let revealCurrent = false;
  let generation = 0;

  const disconnectObservers = (): void => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    resizeObserver = undefined;
    mutationObserver = undefined;
    viewport = undefined;
  };

  const update = (): void => {
    if (!root || !viewport) return;
    const previous = root.querySelector<HTMLButtonElement>('.is-previous');
    const next = root.querySelector<HTMLButtonElement>('.is-next');
    if (!previous || !next) return;

    const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const rtl = isRightToLeft(viewport);
    const position = Math.min(max, Math.max(0, rtl ? -viewport.scrollLeft : viewport.scrollLeft));
    const overflowing = max > 1;
    const canScrollPrevious = overflowing && position > 1;
    const canScrollNext = overflowing && position < max - 1;

    updateControl(previous, overflowing, canScrollPrevious);
    updateControl(next, overflowing, canScrollNext);
    root.toggleAttribute('data-overflow', overflowing);
    root.toggleAttribute('data-overflow-previous', canScrollPrevious);
    root.toggleAttribute('data-overflow-next', canScrollNext);
  };

  const reveal = (target: Element | null): void => {
    if (!viewport || !target) return;
    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const left = targetRect.left < viewportRect.left
      ? targetRect.left - viewportRect.left
      : targetRect.right > viewportRect.right
        ? targetRect.right - viewportRect.right
        : 0;
    if (Math.abs(left) <= 1) return;
    scrollViewport(viewport, left);
  };

  const connectObservers = (): void => {
    if (!root) return;
    const nextViewport = root.querySelector<HTMLElement>('.gluon-navigation-strip-viewport');
    if (!nextViewport || nextViewport === viewport) return;
    disconnectObservers();
    viewport = nextViewport;
    const view = root.ownerDocument.defaultView;
    if (!view) return;

    if (typeof view.ResizeObserver === 'function') {
      resizeObserver = new view.ResizeObserver(() => schedule(true));
      resizeObserver.observe(viewport);
      const content = viewport.querySelector<HTMLElement>('.gluon-navigation-strip-content');
      if (content) resizeObserver.observe(content);
    }
    if (typeof view.MutationObserver === 'function') {
      mutationObserver = new view.MutationObserver(() => schedule(true));
      mutationObserver.observe(viewport, {
        attributes: true,
        attributeFilter: ['aria-current', 'class'],
        childList: true,
        subtree: true,
      });
    }
  };

  const flush = (scheduledGeneration: number): void => {
    scheduled = false;
    if (!root || generation !== scheduledGeneration) return;
    connectObservers();
    update();
    if (revealCurrent) {
      revealCurrent = false;
      reveal(root.querySelector('[aria-current]:not([aria-current="false"])'));
    }
    update();
  };

  function schedule(shouldRevealCurrent = false): void {
    revealCurrent ||= shouldRevealCurrent;
    if (scheduled) return;
    scheduled = true;
    const scheduledGeneration = generation;
    queueMicrotask(() => flush(scheduledGeneration));
  }

  const onResize = (): void => schedule(true);

  return {
    rootRef(element) {
      if (element === root) return;
      const previousView = root?.ownerDocument.defaultView;
      previousView?.removeEventListener('resize', onResize);
      disconnectObservers();
      root = element;
      generation += 1;
      scheduled = false;
      revealCurrent = false;
      root?.ownerDocument.defaultView?.addEventListener('resize', onResize);
      if (root) schedule(true);
    },
    onControlBlur: () => schedule(),
    onScroll: () => schedule(),
    scroll(direction) {
      if (!viewport) return;
      const rtl = isRightToLeft(viewport);
      const distance = Math.max(44, viewport.clientWidth * 0.75);
      scrollViewport(viewport, distance * direction * (rtl ? -1 : 1));
      schedule();
    },
  };
}

function updateControl(
  control: HTMLButtonElement,
  overflowing: boolean,
  canScroll: boolean,
): void {
  const retainsFocus = control.ownerDocument.activeElement === control;
  control.hidden = !overflowing && !retainsFocus;
  control.disabled = !canScroll && !retainsFocus;
  if (!canScroll && retainsFocus) control.setAttribute('aria-disabled', 'true');
  else control.removeAttribute('aria-disabled');
}

function scrollViewport(viewport: HTMLElement, left: number): void {
  if (typeof viewport.scrollBy === 'function') viewport.scrollBy({ left, behavior: 'auto' });
  else viewport.scrollLeft += left;
}

function isRightToLeft(element: Element): boolean {
  return element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl';
}

function assignRef(
  ref: QuarkRef<HTMLElement> | undefined,
  element: HTMLElement | undefined,
): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}
