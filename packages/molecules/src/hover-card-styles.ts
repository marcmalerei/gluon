import { createComponentStyleDependency, css } from '@gluonjs/core';

export const hoverCardStyles = css`
  @layer molecules {
    :where(.gluon-hover-card) { position: relative; display: inline-block; max-inline-size: 100%; min-block-size: 44px; color: var(--gluon-hover-card-color, inherit); }
    :where(.gluon-hover-card [part='content']) { position: absolute; z-index: var(--gluon-hover-card-z-index, 110); inset-inline-start: 0; inset-block-start: calc(100% + var(--gluon-hover-card-gap, .5rem)); inline-size: max-content; max-inline-size: min(var(--gluon-hover-card-max-inline-size, 24rem), calc(100vw - 1rem)); max-block-size: min(var(--gluon-hover-card-max-block-size, 32rem), calc(100dvh - 1rem)); overflow: auto; padding: var(--gluon-hover-card-padding, 1rem); border: var(--gluon-hover-card-border, 1px solid var(--gluon-color-rule, #d9e4e2)); border-radius: var(--gluon-hover-card-radius, var(--gluon-radius-surface, .75rem)); background: var(--gluon-hover-card-background, var(--gluon-color-surface, #fff)); color: inherit; box-shadow: var(--gluon-hover-card-shadow, var(--gluon-shadow-surface)); }
    :where(.gluon-hover-card[data-placement='block-start'] [part='content']) { inset-block-start: auto; inset-block-end: calc(100% + var(--gluon-hover-card-gap, .5rem)); }
    :where(.gluon-hover-card[data-placement='inline-start'] [part='content']) { inset-inline-start: auto; inset-inline-end: calc(100% + var(--gluon-hover-card-gap, .5rem)); inset-block-start: 0; }
    :where(.gluon-hover-card[data-placement='inline-end'] [part='content']) { inset-inline-start: calc(100% + var(--gluon-hover-card-gap, .5rem)); inset-block-start: 0; }
    :where(.gluon-hover-card [part='content']:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: -3px; }
    @media (max-width: 30rem) { :where(.gluon-hover-card [part='content']) { max-inline-size: calc(100vw - 1rem); } }
    @media (forced-colors: active) { :where(.gluon-hover-card [part='content']) { border: 2px solid CanvasText; background: Canvas; color: CanvasText; box-shadow: none; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-hover-card, .gluon-hover-card *) { transition: none !important; animation: none !important; } }
  }
`;

export const hoverCardStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-hover-card', sheet: hoverCardStyles, layer: 'molecule', order: 49, scope: 'gluon-component' });
