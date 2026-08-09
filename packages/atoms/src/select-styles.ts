import { createComponentStyleDependency, css } from '@gluonjs/core';

export const selectStyles = css`
  @layer atoms {
    :where(.gluon-select) {
      min-block-size: 44px;
      block-size: 44px;
      max-inline-size: 100%;
      background: var(--gluon-select-background, var(--gluon-color-surface, white));
      border: 1px solid var(--gluon-select-border-color, var(--gluon-color-rule, #b8c9c6));
      border-radius: calc(var(--gluon-radius-control, 0.625rem) * 0.8);
      color: var(--gluon-select-color, var(--gluon-color-text, inherit));
      cursor: pointer;
      font: inherit;
      line-height: 1.25;
      padding-block: 0.625rem;
      padding-inline: 0.75rem 2rem;
    }
    :where(.gluon-select.is-small) { padding-block: 0.5rem; padding-inline-start: 0.625rem; }
    :where(.gluon-select.is-large) { min-block-size: 52px; block-size: 52px; padding-block: 0.875rem; padding-inline-start: 1rem; }
    :where(.gluon-select.is-full-width) { inline-size: 100%; }
    :where(.gluon-select[aria-invalid="true"]) { border-color: var(--gluon-color-danger, #a52222); }
    :where(.gluon-select:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-select):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-select) { scroll-behavior: auto; } }
  }
`;

export const selectStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-select',
  sheet: selectStyles,
  layer: 'atom',
  order: 4,
  scope: 'gluon-component',
});
