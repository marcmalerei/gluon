import { createComponentStyleDependency, css } from '@gluonjs/core';

export const workflowTimelineStyles = css`
  @layer organisms {
    :where(.gluon-workflow-timeline) { color: var(--gluon-workflow-timeline-color, inherit); min-inline-size: 0; }
    :where(.gluon-workflow-timeline-summary) { margin: 0 0 var(--gluon-workflow-timeline-summary-gap, 1rem); font-weight: var(--gluon-workflow-timeline-heading-weight, 700); }
    :where(.gluon-workflow-timeline-list) { display: grid; gap: var(--gluon-workflow-timeline-list-gap, 1rem); list-style: none; margin: 0; padding: 0; }
    :where(.gluon-workflow-timeline-step) { position: relative; min-inline-size: 0; }
    :where(.gluon-workflow-timeline-step-content) { display: grid; gap: var(--gluon-workflow-timeline-content-gap, .375rem); min-block-size: var(--gluon-workflow-timeline-target-size, 2.75rem); min-inline-size: 0; padding: var(--gluon-workflow-timeline-step-padding, .75rem); border: var(--gluon-workflow-timeline-border-width, 1px) solid var(--gluon-workflow-timeline-border, currentColor); border-radius: var(--gluon-workflow-timeline-radius, .5rem); }
    :where(.gluon-workflow-timeline-step-marker) { display: inline-grid; place-items: center; min-inline-size: var(--gluon-workflow-timeline-target-size, 2.75rem); min-block-size: var(--gluon-workflow-timeline-target-size, 2.75rem); border-radius: var(--gluon-workflow-timeline-marker-radius, 50%); background: var(--gluon-workflow-timeline-marker, currentColor); color: var(--gluon-workflow-timeline-marker-text, Canvas); font-weight: var(--gluon-workflow-timeline-heading-weight, 700); }
    :where(.gluon-workflow-timeline-step-title) { font-weight: var(--gluon-workflow-timeline-heading-weight, 700); overflow-wrap: anywhere; }
    :where(.gluon-workflow-timeline-step-meta, .gluon-workflow-timeline-next, .gluon-workflow-timeline-evidence) { color: var(--gluon-workflow-timeline-muted, currentColor); }
    :where(.gluon-workflow-timeline-actions) { display: flex; flex-wrap: wrap; gap: var(--gluon-workflow-timeline-action-gap, .5rem); }
    :where(.gluon-workflow-timeline-actions > :is(a, button), .gluon-workflow-timeline-next :is(a, button)) { min-block-size: var(--gluon-workflow-timeline-target-size, 2.75rem); min-inline-size: var(--gluon-workflow-timeline-target-size, 2.75rem); }
    :where(.gluon-workflow-timeline[data-state='invalid']) { border-inline-start: var(--gluon-workflow-timeline-invalid-border-width, .25rem) solid var(--gluon-workflow-timeline-invalid, currentColor); padding-inline-start: var(--gluon-workflow-timeline-invalid-padding, .75rem); }
    :where(.gluon-workflow-timeline [part='state-message']) { margin: 0; }
    @media (min-width: 48rem) {
      :where(.gluon-workflow-timeline-list) { grid-template-columns: repeat(var(--gluon-workflow-timeline-count, 1), minmax(0, 1fr)); align-items: start; }
      :where(.gluon-workflow-timeline-step)::after { content: ''; position: absolute; inset-block-start: calc(var(--gluon-workflow-timeline-target-size, 2.75rem) / 2); inset-inline-start: 100%; inline-size: var(--gluon-workflow-timeline-list-gap, 1rem); border-block-start: var(--gluon-workflow-timeline-border-width, 1px) solid var(--gluon-workflow-timeline-border, currentColor); }
      :where(.gluon-workflow-timeline-step:last-child)::after { display: none; }
    }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-workflow-timeline *) { scroll-behavior: auto; transition: none; animation: none; } }
    @media (forced-colors: active) { :where(.gluon-workflow-timeline-step-content) { border: 1px solid CanvasText; } :where(.gluon-workflow-timeline-step-marker) { border: 1px solid CanvasText; background: Canvas; color: CanvasText; } }
  }
`;

export const workflowTimelineStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-workflow-timeline', sheet: workflowTimelineStyles, layer: 'organism', order: 1, scope: 'gluon-component' });
