import { createComponentStyleDependency, css } from '@gluonjs/core';

export const emptyStateStyles = css`
  @layer molecules {
    :where(.gluon-empty-state) { display: grid; justify-items: center; align-content: center; gap: var(--gluon-empty-state-gap, 1rem); inline-size: 100%; min-inline-size: 0; min-block-size: var(--gluon-empty-state-min-block-size, 18rem); padding: var(--gluon-empty-state-padding, clamp(2rem, 8vw, 5rem) clamp(1rem, 5vw, 3rem)); text-align: center; overflow-wrap: anywhere; }
    :where(.gluon-empty-state.is-compact) { --gluon-empty-state-min-block-size: auto; --gluon-empty-state-padding: 1.25rem; --gluon-empty-state-gap: 0.75rem; }
    :where(.gluon-empty-state-media) { display: grid; place-items: center; max-inline-size: var(--gluon-empty-state-media-size, 12rem); }
    :where(.gluon-empty-state-heading) { max-inline-size: var(--gluon-empty-state-heading-size, 32rem); font-size: var(--gluon-empty-state-heading-font-size, clamp(1.35rem, 4vw, 2rem)); font-weight: 750; line-height: 1.15; }
    :where(.gluon-empty-state-body) { max-inline-size: var(--gluon-empty-state-body-size, 42rem); color: var(--gluon-empty-state-body-color, var(--gluon-color-muted, #53605e)); line-height: 1.55; }
    :where(.gluon-empty-state-action) { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--gluon-empty-state-action-gap, 0.5rem 0.75rem); }
    :where(.gluon-empty-state-action :is(a, button)) { display: inline-flex; align-items: center; min-block-size: 44px; }
    @media (forced-colors: active) { :where(.gluon-empty-state) { color: CanvasText; } :where(.gluon-empty-state-body) { color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-empty-state, .gluon-empty-state *) { animation: none !important; transition: none !important; } }
  }
`;

export const emptyStateStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-empty-state',
  sheet: emptyStateStyles,
  layer: 'molecule',
  order: 13,
  scope: 'gluon-component',
});
