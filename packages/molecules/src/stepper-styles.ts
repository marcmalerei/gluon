import { createComponentStyleDependency, css } from '@gluonjs/core';

export const stepperStyles = css`
  @layer molecules {
    :where(.gluon-stepper ol) { display: grid; grid-template-columns: repeat(var(--gluon-stepper-columns, auto-fit), minmax(min(10rem, 100%), 1fr)); gap: var(--gluon-stepper-gap, 1rem); margin: 0; padding: 0; list-style: none; }
    :where(.gluon-stepper-step) { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .5rem; align-items: start; min-block-size: 44px; color: var(--gluon-stepper-muted, var(--gluon-color-muted, #526663)); }
    :where(.gluon-stepper-step:not(:last-child))::after { position: absolute; inset-block-start: 1rem; inset-inline-start: 1rem; z-index: -1; inline-size: calc(100% - .5rem); border-block-start: 1px solid var(--gluon-stepper-rule, var(--gluon-color-rule, #b8c9c6)); content: ''; }
    :where(.gluon-stepper-marker) { display: grid; inline-size: 2rem; block-size: 2rem; place-items: center; border: 1px solid currentColor; border-radius: 50%; background: var(--gluon-stepper-marker-background, var(--gluon-color-surface, #fff)); font-size: .8125rem; font-weight: 700; }
    :where(.gluon-stepper-label) { align-self: center; min-block-size: 2rem; padding-block: .4rem; color: inherit; font-weight: 650; text-decoration: none; }
    :where(.gluon-stepper-label[href]:hover) { text-decoration: underline; text-underline-offset: .2em; }
    :where(.gluon-stepper-description, .gluon-stepper-content) { grid-column: 2; font-size: .8125rem; }
    :where(.gluon-stepper-description) { color: var(--gluon-stepper-description, var(--gluon-color-muted, #526663)); }
    :where(.gluon-stepper-content) { margin-block-start: .25rem; }
    :where(.gluon-stepper-step.is-complete, .gluon-stepper-step.is-current) { color: var(--gluon-stepper-active, var(--gluon-color-action, #087f7b)); }
    :where(.gluon-stepper-step.is-error) { color: var(--gluon-stepper-error, var(--gluon-color-danger, #a52222)); }
    :where(.gluon-stepper-step.is-disabled) { color: var(--gluon-stepper-disabled, var(--gluon-color-muted, #526663)); opacity: .65; }
    :where(.gluon-stepper-step.is-current .gluon-stepper-marker) { box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 22%, transparent); }
    :where(.gluon-stepper-label:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: var(--gluon-focus-offset, 3px); }
    @media (max-width: 40rem) { :where(.gluon-stepper ol) { grid-template-columns: 1fr; gap: .5rem; } :where(.gluon-stepper-step:not(:last-child))::after { inset-block-start: 2rem; inset-inline-start: 1rem; inline-size: auto; block-size: calc(100% - 1rem); border-block-start: 0; border-inline-start: 1px solid var(--gluon-stepper-rule, var(--gluon-color-rule, #b8c9c6)); } }
    @media (forced-colors: active) { :where(.gluon-stepper-step:not(:last-child))::after { border-color: CanvasText; } :where(.gluon-stepper-marker) { background: Canvas; color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-stepper-step) { scroll-behavior: auto; } }
  }
`;

export const stepperStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-stepper', sheet: stepperStyles, layer: 'molecule', order: 43, scope: 'gluon-component' });
