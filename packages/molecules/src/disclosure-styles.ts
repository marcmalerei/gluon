import { createComponentStyleDependency, css } from '@gluonjs/core';

export const disclosureStyles = css`
  @layer molecules {
    :where(.gluon-disclosure) { border-block: var(--gluon-disclosure-border, 1px solid var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-disclosure + .gluon-disclosure) { border-block-start: 0; }
    :where(.gluon-disclosure-summary) { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--gluon-disclosure-summary-gap, 0.5rem 1rem); min-block-size: 44px; padding: var(--gluon-disclosure-summary-padding, 0.875rem 0); color: var(--gluon-disclosure-summary-color, inherit); font-weight: var(--gluon-disclosure-summary-weight, 650); cursor: pointer; list-style: none; }
    :where(.gluon-disclosure-summary::-webkit-details-marker) { display: none; }
    :where(.gluon-disclosure-summary)::after { content: var(--gluon-disclosure-marker, "›"); grid-column: 2; grid-row: 1; color: var(--gluon-disclosure-marker-color, currentColor); font-size: var(--gluon-disclosure-marker-size, 1.25rem); transform: rotate(0deg); transform-origin: center; transition: transform var(--gluon-disclosure-motion-duration, 140ms) ease; }
    :where(.gluon-disclosure[open] > .gluon-disclosure-summary)::after { transform: rotate(90deg); }
    :where(.gluon-disclosure-summary:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    :where(.gluon-disclosure-summary[aria-disabled="true"]) { cursor: not-allowed; opacity: 0.65; }
    :where(.gluon-disclosure-unavailable) { grid-column: 1; color: var(--gluon-disclosure-unavailable-color, var(--gluon-color-muted, #53605e)); font-size: 0.8125rem; font-weight: 400; }
    :where(.gluon-disclosure-content) { padding: var(--gluon-disclosure-content-padding, 0 0 1rem); }
    @media (forced-colors: active) { :where(.gluon-disclosure) { border-color: CanvasText; } :where(.gluon-disclosure-summary[aria-disabled="true"]) { color: GrayText; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-disclosure-summary)::after { transition: none; } }
  }
`;

export const disclosureStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-disclosure',
  sheet: disclosureStyles,
  layer: 'molecule',
  order: 10,
  scope: 'gluon-component',
});
