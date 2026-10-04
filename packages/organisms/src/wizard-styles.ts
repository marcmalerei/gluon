import { createComponentStyleDependency, css } from '@gluonjs/core';

export const wizardStyles = css`
  @layer organisms {
    :where(.gluon-wizard) { display: grid; gap: var(--gluon-wizard-gap, 1.25rem); min-inline-size: 0; color: var(--gluon-wizard-color, inherit); }
    :where(.gluon-wizard-header, .gluon-wizard-content, .gluon-wizard-controls) { min-inline-size: 0; }
    :where(.gluon-wizard-header h2, .gluon-wizard-content-title) { margin: 0; overflow-wrap: anywhere; }
    :where(.gluon-wizard-navigation ol) { display: grid; grid-template-columns: repeat(var(--gluon-wizard-step-count, auto-fit), minmax(0, 1fr)); gap: var(--gluon-wizard-step-gap, .5rem); margin: 0; padding: 0; list-style: none; }
    :where(.gluon-wizard-step-button, .gluon-wizard-control) { min-block-size: var(--gluon-wizard-target-size, 2.75rem); min-inline-size: var(--gluon-wizard-target-size, 2.75rem); border: var(--gluon-wizard-border-width, 1px) solid var(--gluon-wizard-border, currentColor); border-radius: var(--gluon-wizard-radius, .375rem); background: var(--gluon-wizard-surface, transparent); color: inherit; font: inherit; }
    :where(.gluon-wizard-step-button) { display: grid; gap: .25rem; padding: .5rem .75rem; text-align: start; }
    :where(.gluon-wizard-step-button[aria-current='step']) { border-color: var(--gluon-wizard-current, currentColor); box-shadow: inset 0 -.2rem var(--gluon-wizard-current, currentColor); font-weight: 700; }
    :where(.gluon-wizard-step-button:disabled, .gluon-wizard-control:disabled) { cursor: not-allowed; opacity: .55; }
    :where(.gluon-wizard-step-description, .gluon-wizard-current) { color: var(--gluon-wizard-muted, currentColor); }
    :where(.gluon-wizard-content) { display: grid; gap: var(--gluon-wizard-content-gap, .75rem); min-block-size: var(--gluon-wizard-content-min-block-size, 8rem); padding: var(--gluon-wizard-content-padding, 1rem); border: var(--gluon-wizard-border-width, 1px) solid var(--gluon-wizard-border, currentColor); border-radius: var(--gluon-wizard-radius, .375rem); }
    :where(.gluon-wizard-controls) { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem; }
    :where(.gluon-wizard-control) { padding-inline: 1rem; }
    :where(.gluon-wizard button:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    :where(.gluon-wizard[data-state='invalid']) { border-inline-start: .25rem solid var(--gluon-wizard-invalid, currentColor); padding-inline-start: .75rem; }
    @media (max-width: 48rem) { :where(.gluon-wizard-navigation ol) { grid-template-columns: 1fr; } :where(.gluon-wizard-step:not(.is-current)) { display: none; } }
    @media (forced-colors: active) { :where(.gluon-wizard-step-button, .gluon-wizard-control, .gluon-wizard-content) { border-color: CanvasText; } :where(.gluon-wizard-step-button[aria-current='step']) { box-shadow: inset 0 -.2rem Highlight; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-wizard, .gluon-wizard *) { animation: none !important; transition: none !important; } }
  }
`;

export const wizardStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-wizard', sheet: wizardStyles, layer: 'organism', order: 14, scope: 'gluon-component' });
