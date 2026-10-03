import { createComponentStyleDependency, css } from '@gluonjs/core';

export const popoverStyles = css`
  @layer molecules {
    :where(.gluon-popover) { position: relative; display: inline-block; max-inline-size: 100%; }
    :where(.gluon-popover-content) { position: absolute; z-index: var(--gluon-popover-z-index, 110); inset-inline-start: 0; inset-block-start: calc(100% + var(--gluon-popover-gap, .5rem)); inline-size: max-content; max-inline-size: min(var(--gluon-popover-max-inline-size, 24rem), calc(100vw - 1rem)); max-block-size: min(var(--gluon-popover-max-block-size, 32rem), calc(100dvh - 1rem)); overflow: auto; padding: var(--gluon-popover-padding, 1rem); border: var(--gluon-popover-border, 1px solid var(--gluon-color-rule, #d9e4e2)); border-radius: var(--gluon-popover-radius, var(--gluon-radius-surface, .75rem)); background: var(--gluon-popover-background, var(--gluon-color-surface, #fff)); color: var(--gluon-popover-color, var(--gluon-color-text, #12312f)); box-shadow: var(--gluon-popover-shadow, var(--gluon-shadow-surface)); }
    :where(.gluon-popover.is-block-start .gluon-popover-content) { inset-block-start: auto; inset-block-end: calc(100% + var(--gluon-popover-gap, .5rem)); }
    :where(.gluon-popover.is-inline-start .gluon-popover-content) { inset-inline-start: auto; inset-inline-end: calc(100% + var(--gluon-popover-gap, .5rem)); inset-block-start: 0; }
    :where(.gluon-popover.is-inline-end .gluon-popover-content) { inset-inline-start: calc(100% + var(--gluon-popover-gap, .5rem)); inset-block-start: 0; }
    :where(.gluon-popover-content:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: -3px; }
    @media (max-width: 30rem) { :where(.gluon-popover-content) { max-inline-size: calc(100vw - 1rem); } }
    @media (forced-colors: active) { :where(.gluon-popover-content) { border: 2px solid CanvasText; background: Canvas; color: CanvasText; box-shadow: none; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-popover-content) { transition: none !important; animation: none !important; } }
  }
`;

export const popoverStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-popover',
  sheet: popoverStyles,
  layer: 'molecule',
  order: 43,
  scope: 'gluon-component',
});
