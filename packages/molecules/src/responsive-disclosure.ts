import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { disclosureStyleDependency } from './disclosure-styles.js';

export type ResponsiveDisclosureAttributes = Omit<
  QuarkProps<HTMLDetailsElement>,
  'children' | 'open' | '.open'
>;

export interface ResponsiveDisclosureProps {
  readonly id: string;
  readonly summary: TemplateValue;
  readonly children: TemplateValue;
  readonly compactBreakpoint: string;
  readonly compactInitialOpen?: boolean;
  readonly compactResetToken?: string | number;
  readonly onToggle?: (event: Event) => void;
  readonly attributes?: ResponsiveDisclosureAttributes;
  readonly summaryAttributes?: Omit<QuarkProps<HTMLElement>, 'children' | 'aria'> & {
    readonly aria?: QuarkProps<HTMLElement>['aria'];
  };
  readonly contentAttributes?: Omit<QuarkProps<HTMLDivElement>, 'children'>;
}

type MediaQueryListWithLegacyListeners = MediaQueryList & {
  addListener?(listener: (event: MediaQueryListEvent) => void): void;
  removeListener?(listener: (event: MediaQueryListEvent) => void): void;
};

interface RootState {
  componentId: string;
  compactOpen: boolean;
  compact: boolean;
  compactResetToken: string | number | undefined;
  owner?: symbol;
  query?: MediaQueryListWithLegacyListeners;
  queryListener?: (event: MediaQueryListEvent) => void;
}

interface ResponsiveDisclosureController {
  readonly rootRef: QuarkRef<HTMLDetailsElement>;
  readonly onToggle: (event: Event) => void;
  readonly prepareCompactToggle: (event: MouseEvent) => void;
}

const rootStates = new WeakMap<HTMLDetailsElement, RootState>();

function createController(
  id: string,
  compactInitialOpen: boolean,
  compactBreakpoint: string,
  compactResetToken: string | number | undefined,
  onToggle?: (event: Event) => void,
): ResponsiveDisclosureController {
  const owner = Symbol('responsive-disclosure-owner');
  let root: HTMLDetailsElement | undefined;

  const synchronize = (state: RootState, compact: boolean): void => {
    if (!root || rootStates.get(root) !== state || state.owner !== owner) return;
    root.open = compact ? state.compactOpen : true;
    state.compact = compact;
    root.toggleAttribute('data-compact', compact);
    synchronizeExpanded(root);
    const synchronizedRoot = root;
    queueMicrotask(() => {
      if (
        root === synchronizedRoot
        && rootStates.get(synchronizedRoot) === state
        && state.owner === owner
      ) {
        synchronizeExpanded(synchronizedRoot);
      }
    });
  };

  const disconnect = (state: RootState): void => {
    if (state.owner !== owner) return;
    if (state.query && state.queryListener) {
      if (typeof state.query.removeEventListener === 'function') {
        state.query.removeEventListener('change', state.queryListener);
      } else {
        state.query.removeListener?.(state.queryListener);
      }
    }
    state.query = undefined;
    state.queryListener = undefined;
    state.owner = undefined;
  };

  const connect = (element: HTMLDetailsElement): void => {
    let state = rootStates.get(element);
    if (!state) {
      state = {
        componentId: id,
        compactOpen: compactInitialOpen,
        compact: true,
        compactResetToken,
      };
      rootStates.set(element, state);
    } else if (state.componentId !== id || state.compactResetToken !== compactResetToken) {
      state.compactOpen = compactInitialOpen;
    }

    if (state.owner && state.owner !== owner) releaseCurrentConnection(state);
    state.componentId = id;
    state.compactResetToken = compactResetToken;
    state.owner = owner;
    element.removeAttribute('data-gluon-responsive-disclosure-error');

    const view = element.ownerDocument.defaultView;
    if (typeof view?.matchMedia !== 'function') {
      element.setAttribute(
        'data-gluon-responsive-disclosure-error',
        'GLUON_RESPONSIVE_DISCLOSURE_MATCH_MEDIA_UNAVAILABLE',
      );
      synchronize(state, true);
      return;
    }

    try {
      const query = view.matchMedia(compactBreakpoint) as MediaQueryListWithLegacyListeners;
      if (query.media === 'not all' && compactBreakpoint.trim() !== 'not all') {
        throw new TypeError('Media query could not be parsed.');
      }
      const queryListener = (event: MediaQueryListEvent): void => {
        synchronize(state, event.matches);
      };
      state.query = query;
      state.queryListener = queryListener;
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', queryListener);
      } else if (typeof query.addListener === 'function') {
        query.addListener(queryListener);
      } else {
        throw new TypeError('MediaQueryList has no supported change-listener API.');
      }
      synchronize(state, query.matches);
    } catch {
      releaseCurrentConnection(state);
      state.owner = owner;
      element.setAttribute(
        'data-gluon-responsive-disclosure-error',
        'GLUON_RESPONSIVE_DISCLOSURE_MATCH_MEDIA_FAILED',
      );
      synchronize(state, true);
    }
  };

  return {
    rootRef(element) {
      if (element === root) return;
      if (root) {
        const previousState = rootStates.get(root);
        if (previousState) {
          disconnect(previousState);
        }
      }
      root = element;
      if (root) connect(root);
    },
    onToggle(event) {
      if (!root) return;
      const state = rootStates.get(root);
      if (state?.owner === owner) {
        if (state.compact) state.compactOpen = root.open;
        else if (!root.open) synchronize(state, false);
      }
      synchronizeExpanded(root);
      onToggle?.(event);
    },
    prepareCompactToggle(event) {
      if (!root) return;
      const state = rootStates.get(root);
      if (state?.owner !== owner || event.defaultPrevented) return;
      if (state.compact) {
        state.compactOpen = root.open;
      } else {
        event.preventDefault();
      }
    },
  };
}

function releaseCurrentConnection(state: RootState): void {
  if (state.query && state.queryListener) {
    if (typeof state.query.removeEventListener === 'function') {
      state.query.removeEventListener('change', state.queryListener);
    } else {
      state.query.removeListener?.(state.queryListener);
    }
  }
  state.query = undefined;
  state.queryListener = undefined;
  state.owner = undefined;
}

function synchronizeExpanded(root: HTMLDetailsElement): void {
  root.querySelector('summary')?.setAttribute('aria-expanded', String(root.open));
}

function validateProps(
  id: unknown,
  compactBreakpoint: unknown,
  compactInitialOpen: unknown,
  compactResetToken: unknown,
): void {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new TypeError(
      'GLUON_RESPONSIVE_DISCLOSURE_ID_INVALID: id must be a non-empty string.',
    );
  }
  if (typeof compactBreakpoint !== 'string' || compactBreakpoint.trim().length === 0) {
    throw new TypeError(
      'GLUON_RESPONSIVE_DISCLOSURE_BREAKPOINT_INVALID: compactBreakpoint must be a non-empty media query.',
    );
  }
  if (typeof compactInitialOpen !== 'boolean') {
    throw new TypeError(
      'GLUON_RESPONSIVE_DISCLOSURE_INITIAL_OPEN_INVALID: compactInitialOpen must be boolean.',
    );
  }
  if (
    compactResetToken !== undefined
    && typeof compactResetToken !== 'string'
    && (typeof compactResetToken !== 'number' || !Number.isFinite(compactResetToken))
  ) {
    throw new TypeError(
      'GLUON_RESPONSIVE_DISCLOSURE_RESET_TOKEN_INVALID: compactResetToken must be a string or finite number.',
    );
  }
}

function assignRef(
  ref: QuarkRef<HTMLDetailsElement> | undefined,
  element: HTMLDetailsElement | undefined,
): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

function callListener<EventType extends Event>(
  listener:
    | ((event: EventType) => unknown)
    | { handleEvent(event: EventType): void }
    | null
    | undefined,
  event: EventType,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

function renderResponsiveDisclosure({
  id,
  summary,
  children,
  compactBreakpoint,
  compactInitialOpen = false,
  compactResetToken,
  onToggle,
  attributes = {},
  summaryAttributes = {},
  contentAttributes = {},
}: ResponsiveDisclosureProps): TemplateResult {
  validateProps(id, compactBreakpoint, compactInitialOpen, compactResetToken);
  const controller = createController(
    id,
    compactInitialOpen,
    compactBreakpoint,
    compactResetToken,
    onToggle,
  );
  const { '@toggle': attributeToggle, ref: attributeRef, ...nativeAttributes } = attributes;
  const { aria: summaryAria, onClick: summaryClick, ...nativeSummaryAttributes } = summaryAttributes;

  return q.details({
    ...nativeAttributes,
    id,
    open: compactInitialOpen,
    ref: (element) => {
      assignRef(controller.rootRef, element);
      assignRef(attributeRef, element);
    },
    class: [
      {
        gluon: true,
        molecule: true,
        'gluon-disclosure': true,
        'gluon-responsive-disclosure': true,
      },
      attributes.class,
    ],
    data: { ...attributes.data, compactBreakpoint },
    '@toggle': (event: Event) => {
      callListener(attributeToggle, event);
      controller.onToggle(event);
    },
    children: [
      q.summary({
        ...nativeSummaryAttributes,
        class: [{ 'gluon-disclosure-summary': true }, summaryAttributes.class],
        aria: { ...summaryAria, expanded: String(compactInitialOpen) },
        onClick: (event: MouseEvent) => {
          callListener(summaryClick, event);
          controller.prepareCompactToggle(event);
        },
        children: q.span({
          class: 'gluon-disclosure-summary-label',
          children: summary,
        }),
      }),
      q.div({
        ...contentAttributes,
        class: [{ 'gluon-disclosure-content': true }, contentAttributes.class],
        children,
      }),
    ],
  });
}

export const ResponsiveDisclosure = defineMolecule(
  renderResponsiveDisclosure,
  'ResponsiveDisclosure',
  [disclosureStyleDependency],
);
