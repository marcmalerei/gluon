import { createComponentStyleDependency, css } from '@gluonjs/core';

export const statusTrackerStyles = css`
  @layer organisms {
    :where(.gluon-status-tracker) { display: grid; gap: var(--gluon-status-tracker-gap, 1rem); min-inline-size: 0; color: var(--gluon-status-tracker-color, inherit); }
    :where(.gluon-status-tracker h2, .gluon-status-tracker h3, .gluon-status-tracker p) { margin: 0; overflow-wrap: anywhere; }
    :where(.gluon-status-tracker-summary) { color: var(--gluon-status-tracker-muted, currentColor); }
    :where(.gluon-status-tracker-list) { display: grid; gap: var(--gluon-status-tracker-list-gap, .75rem); margin: 0; padding: 0; list-style: none; }
    :where(.gluon-status-tracker-item) { min-inline-size: 0; }
    :where(.gluon-status-tracker-item-content) { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .75rem; min-block-size: var(--gluon-status-tracker-target-size, 2.75rem); padding: var(--gluon-status-tracker-item-padding, .75rem); border: 1px solid var(--gluon-status-tracker-border, currentColor); border-radius: var(--gluon-status-tracker-radius, .5rem); background: var(--gluon-status-tracker-surface, transparent); }
    :where(.gluon-status-tracker-marker) { display: grid; place-items: center; min-inline-size: var(--gluon-status-tracker-target-size, 2.75rem); min-block-size: var(--gluon-status-tracker-target-size, 2.75rem); border-radius: 50%; background: var(--gluon-status-tracker-marker, currentColor); color: var(--gluon-status-tracker-marker-text, Canvas); font-weight: 700; }
    :where(.gluon-status-tracker-item[data-status='in-progress'] .gluon-status-tracker-marker) { background: var(--gluon-status-tracker-progress, currentColor); }
    :where(.gluon-status-tracker-item[data-status='success'] .gluon-status-tracker-marker) { background: var(--gluon-status-tracker-success, currentColor); }
    :where(.gluon-status-tracker-item[data-status='warning'] .gluon-status-tracker-marker) { background: var(--gluon-status-tracker-warning, currentColor); }
    :where(.gluon-status-tracker-item[data-status='error'] .gluon-status-tracker-marker) { background: var(--gluon-status-tracker-error, currentColor); }
    :where(.gluon-status-tracker-item[data-status='paused'] .gluon-status-tracker-marker) { background: var(--gluon-status-tracker-paused, currentColor); }
    :where(.gluon-status-tracker-item[aria-current='step'] .gluon-status-tracker-item-content) { border-color: var(--gluon-status-tracker-current, currentColor); box-shadow: inset .2rem 0 var(--gluon-status-tracker-current, currentColor); }
    :where(.gluon-status-tracker-item-details) { display: grid; gap: .375rem; min-inline-size: 0; align-content: start; }
    :where(.gluon-status-tracker-item-title) { font-weight: 700; overflow-wrap: anywhere; }
    :where(.gluon-status-tracker-item-meta, .gluon-status-tracker-item-description) { color: var(--gluon-status-tracker-muted, currentColor); }
    :where(.gluon-status-tracker-progress) { inline-size: min(100%, 24rem); block-size: .5rem; accent-color: var(--gluon-status-tracker-progress, currentColor); }
    :where(.gluon-status-tracker-actions) { display: flex; flex-wrap: wrap; gap: .5rem; }
    :where(.gluon-status-tracker-actions > :is(a, button, input, select, textarea)) { min-block-size: var(--gluon-status-tracker-target-size, 2.75rem); min-inline-size: var(--gluon-status-tracker-target-size, 2.75rem); }
    :where(.gluon-status-tracker[data-state='error']) { border-inline-start: .25rem solid var(--gluon-status-tracker-error, currentColor); padding-inline-start: .75rem; }
    :where(.gluon-status-tracker :is(a, button, input, select, textarea):focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) { :where(.gluon-status-tracker-item-content) { grid-template-columns: auto minmax(0, 1fr); } }
    @media (forced-colors: active) { :where(.gluon-status-tracker-item-content) { border-color: CanvasText; } :where(.gluon-status-tracker-marker) { border: 1px solid CanvasText; background: Canvas; color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-status-tracker, .gluon-status-tracker *) { animation: none !important; transition: none !important; } }
  }
`;

export const statusTrackerStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-status-tracker', sheet: statusTrackerStyles, layer: 'organism', order: 17, scope: 'gluon-component' });
