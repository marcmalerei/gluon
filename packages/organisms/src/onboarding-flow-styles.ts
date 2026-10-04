import { createComponentStyleDependency, css } from '@gluonjs/core';

export const onboardingFlowStyles = css`
  @layer organisms {
    :where(.gluon-onboarding-flow) { display: grid; gap: var(--gluon-onboarding-flow-gap, 1.25rem); min-inline-size: 0; color: var(--gluon-onboarding-flow-color, inherit); }
    :where(.gluon-onboarding-flow h2, .gluon-onboarding-flow h3) { margin: 0; overflow-wrap: anywhere; }
    :where(.gluon-onboarding-flow-navigation ol) { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: .5rem; margin: 0; padding: 0; list-style: none; }
    :where(.gluon-onboarding-flow-step button, .gluon-onboarding-flow-controls button) { min-block-size: var(--gluon-onboarding-flow-target-size, 2.75rem); min-inline-size: var(--gluon-onboarding-flow-target-size, 2.75rem); border: 1px solid var(--gluon-onboarding-flow-border, currentColor); border-radius: var(--gluon-onboarding-flow-radius, .375rem); background: var(--gluon-onboarding-flow-surface, transparent); color: inherit; font: inherit; }
    :where(.gluon-onboarding-flow-step button) { display: grid; gap: .25rem; padding: .5rem .75rem; text-align: start; }
    :where(.gluon-onboarding-flow-step button[aria-current='step']) { border-color: var(--gluon-onboarding-flow-current, currentColor); box-shadow: inset 0 -.2rem var(--gluon-onboarding-flow-current, currentColor); font-weight: 700; }
    :where(.gluon-onboarding-flow-content, .gluon-onboarding-flow-completion) { display: grid; gap: .75rem; min-block-size: 8rem; padding: var(--gluon-onboarding-flow-content-padding, 1rem); border: 1px solid var(--gluon-onboarding-flow-border, currentColor); border-radius: var(--gluon-onboarding-flow-radius, .375rem); }
    :where(.gluon-onboarding-flow-controls) { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem; }
    :where(.gluon-onboarding-flow-controls button) { padding-inline: 1rem; }
    :where(.gluon-onboarding-flow button:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    :where(.gluon-onboarding-flow[data-state='invalid']) { border-inline-start: .25rem solid var(--gluon-onboarding-flow-invalid, currentColor); padding-inline-start: .75rem; }
    @media (max-width: 48rem) { :where(.gluon-onboarding-flow-navigation ol) { grid-template-columns: 1fr; } :where(.gluon-onboarding-flow-step:not(.is-current)) { display: none; } }
    @media (forced-colors: active) { :where(.gluon-onboarding-flow-step button, .gluon-onboarding-flow-controls button, .gluon-onboarding-flow-content, .gluon-onboarding-flow-completion) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-onboarding-flow, .gluon-onboarding-flow *) { animation: none !important; transition: none !important; } }
  }
`;

export const onboardingFlowStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-onboarding-flow', sheet: onboardingFlowStyles, layer: 'organism', order: 15, scope: 'gluon-component' });
