import { createComponentStyleDependency, css } from '@gluonjs/core';

export const buttonStyles = css`
  @layer atoms {
    :where(.gluon-button) { appearance: none; min-block-size: 44px; border: 1px solid transparent; border-radius: var(--gluon-radius-control, 0.625rem); cursor: pointer; font: inherit; font-weight: 650; line-height: 1; padding: var(--gluon-space-control-block, 0.75rem) var(--gluon-space-control-inline, 1rem); }
    :where(.gluon-button.is-primary) { background: var(--gluon-color-action, #087f7b); color: var(--gluon-color-action-text, white); }
    :where(.gluon-button.is-secondary) { background: var(--gluon-color-action-soft, #e6f4f1); color: var(--gluon-color-action-soft-text, #075e5b); }
    :where(.gluon-button.is-ghost) { background: transparent; border-color: currentcolor; color: inherit; }
    :where(.gluon-button.is-small) { padding-block: 0.5rem; padding-inline: 0.75rem; }
    :where(.gluon-button.is-large) { padding-block: 0.875rem; padding-inline: 1.25rem; }
    :where(.gluon-button:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-button):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-button) { scroll-behavior: auto; } }
  }
`;

export const buttonStyleDependency = createComponentStyleDependency({ id: 'gluon-atom-button', sheet: buttonStyles, layer: 'atom', order: 0, scope: 'gluon-component' });
