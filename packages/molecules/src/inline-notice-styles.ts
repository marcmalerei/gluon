import { createComponentStyleDependency, css } from '@gluonjs/core';

export const inlineNoticeStyles = css`
  @layer molecules {
    :where(.gluon-inline-notice) { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--gluon-inline-notice-gap, 0.75rem 1rem); padding: var(--gluon-inline-notice-padding, 1rem); border: var(--gluon-inline-notice-border, 1px solid #a9b4b2); border-inline-start-width: var(--gluon-inline-notice-accent-width, 0.3rem); border-radius: var(--gluon-inline-notice-radius, var(--gluon-radius-medium, 0.5rem)); background: var(--gluon-inline-notice-background, #f4f5f5); color: var(--gluon-inline-notice-color, #16201f); overflow-wrap: anywhere; }
    :where(.gluon-inline-notice.is-info) { --gluon-inline-notice-border: 1px solid #7994d3; --gluon-inline-notice-background: #eaf0ff; --gluon-inline-notice-color: #173f91; }
    :where(.gluon-inline-notice.is-success) { --gluon-inline-notice-border: 1px solid #6fa384; --gluon-inline-notice-background: #e8f5ed; --gluon-inline-notice-color: #14532d; }
    :where(.gluon-inline-notice.is-warning) { --gluon-inline-notice-border: 1px solid #c59737; --gluon-inline-notice-background: #fff4d6; --gluon-inline-notice-color: #5b3a00; }
    :where(.gluon-inline-notice.is-danger) { --gluon-inline-notice-border: 1px solid #d48787; --gluon-inline-notice-background: #fdecec; --gluon-inline-notice-color: #7f1d1d; }
    :where(.gluon-inline-notice-marker) { display: inline-grid; place-items: center; inline-size: 1.5rem; block-size: 1.5rem; border: 1px solid currentColor; border-radius: 50%; font-weight: 750; line-height: 1; }
    :where(.gluon-inline-notice-announcement) { display: grid; gap: 0.35rem; min-inline-size: 0; }
    :where(.gluon-inline-notice-title) { font-weight: 750; }
    :where(.gluon-inline-notice-body) { min-inline-size: 0; }
    :where(.gluon-inline-notice-actions) { grid-column: 2; display: flex; flex-wrap: wrap; align-items: center; gap: var(--gluon-inline-notice-action-gap, 0.5rem 0.75rem); }
    :where(.gluon-inline-notice-actions > *) { min-inline-size: 0; }
    :where(.gluon-inline-notice-actions :is(a, button)) { display: inline-flex; align-items: center; min-block-size: 44px; }
    @media (forced-colors: active) { :where(.gluon-inline-notice) { border: 2px solid CanvasText; background: Canvas; color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-inline-notice, .gluon-inline-notice *) { animation: none !important; transition: none !important; } }
  }
`;

export const inlineNoticeStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-inline-notice',
  sheet: inlineNoticeStyles,
  layer: 'molecule',
  order: 12,
  scope: 'gluon-component',
});
