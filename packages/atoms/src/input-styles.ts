import { createComponentStyleDependency, css } from '@gluonjs/core';

export const inputStyles = css`
  @layer atoms {
    :where(.gluon-input) { min-block-size: 44px; background: var(--gluon-color-surface, white); border: 1px solid var(--gluon-color-rule, #b8c9c6); border-radius: calc(var(--gluon-radius-control, 0.625rem) * 0.8); color: var(--gluon-color-text, inherit); font: inherit; padding-block: 0.675rem; padding-inline: 0.75rem; }
    :where(.gluon-input[aria-invalid="true"]) { border-color: var(--gluon-color-danger, #a52222); }
    :where(.gluon-input):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-input) { scroll-behavior: auto; } }
  }
`;

export const inputStyleDependency = createComponentStyleDependency({ id: 'gluon-atom-input', sheet: inputStyles, layer: 'atom', order: 2, scope: 'gluon-component' });
