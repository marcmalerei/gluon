import { createComponentStyleDependency, css } from '@gluonjs/core';

export const approvalFlowStyles = css`
  @layer organisms {
    :where(.gluon-approval-flow) { display: grid; gap: var(--gluon-approval-flow-gap, 1.25rem); min-inline-size: 0; color: var(--gluon-approval-flow-color, inherit); }
    :where(.gluon-approval-flow h2, .gluon-approval-flow h3) { margin: 0; overflow-wrap: anywhere; }
    :where(.gluon-approval-flow-navigation ol) { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: .5rem; margin: 0; padding: 0; list-style: none; }
    :where(.gluon-approval-flow-stage button) { display: grid; gap: .25rem; min-block-size: var(--gluon-approval-flow-target-size, 2.75rem); min-inline-size: var(--gluon-approval-flow-target-size, 2.75rem); padding: .5rem .75rem; border: 1px solid var(--gluon-approval-flow-border, currentColor); border-radius: var(--gluon-approval-flow-radius, .375rem); background: var(--gluon-approval-flow-surface, transparent); color: inherit; font: inherit; text-align: start; }
    :where(.gluon-approval-flow-stage button[aria-current='step']) { border-color: var(--gluon-approval-flow-current, currentColor); box-shadow: inset 0 -.2rem var(--gluon-approval-flow-current, currentColor); font-weight: 700; }
    :where(.gluon-approval-flow-stage small, .gluon-approval-flow-status) { color: var(--gluon-approval-flow-muted, currentColor); }
    :where(.gluon-approval-flow-content) { display: grid; gap: .75rem; min-block-size: 8rem; padding: var(--gluon-approval-flow-content-padding, 1rem); border: 1px solid var(--gluon-approval-flow-border, currentColor); border-radius: var(--gluon-approval-flow-radius, .375rem); }
    :where(.gluon-approval-flow-actions > :is(a, button)) { min-block-size: var(--gluon-approval-flow-target-size, 2.75rem); min-inline-size: var(--gluon-approval-flow-target-size, 2.75rem); }
    :where(.gluon-approval-flow button:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    :where(.gluon-approval-flow[data-state='rejected']) { border-inline-start: .25rem solid var(--gluon-approval-flow-rejected, currentColor); padding-inline-start: .75rem; }
    @media (max-width: 48rem) { :where(.gluon-approval-flow-navigation ol) { grid-template-columns: 1fr; } :where(.gluon-approval-flow-stage:not(.is-current)) { display: none; } }
    @media (forced-colors: active) { :where(.gluon-approval-flow-stage button, .gluon-approval-flow-content) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-approval-flow, .gluon-approval-flow *) { animation: none !important; transition: none !important; } }
  }
`;

export const approvalFlowStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-approval-flow', sheet: approvalFlowStyles, layer: 'organism', order: 16, scope: 'gluon-component' });
