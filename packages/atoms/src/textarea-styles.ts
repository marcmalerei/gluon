import { createComponentStyleDependency, css } from '@gluonjs/core';

export const textareaStyles = css`
  @layer atoms {
    :where(.gluon-textarea) {
      box-sizing: border-box;
      min-block-size: 96px;
      max-inline-size: 100%;
      background: var(--gluon-textarea-background, var(--gluon-color-surface, white));
      border: 1px solid var(--gluon-textarea-border-color, var(--gluon-color-rule, #b8c9c6));
      border-radius: calc(var(--gluon-radius-control, 0.625rem) * 0.8);
      color: var(--gluon-textarea-color, var(--gluon-color-text, inherit));
      font: inherit;
      line-height: 1.5;
      padding: 0.675rem 0.75rem;
      resize: var(--gluon-textarea-resize, vertical);
    }
    :where(.gluon-textarea.is-full-width) { inline-size: 100%; }
    :where(.gluon-textarea[aria-invalid="true"]) { border-color: var(--gluon-color-danger, #a52222); }
    :where(.gluon-textarea:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-textarea:read-only) { background: var(--gluon-textarea-readonly-background, var(--gluon-color-canvas, #f5f7f7)); }
    :where(.gluon-textarea):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-textarea) { scroll-behavior: auto; } }
  }
`;

export const textareaStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-textarea',
  sheet: textareaStyles,
  layer: 'atom',
  order: 5,
  scope: 'gluon-component',
});
