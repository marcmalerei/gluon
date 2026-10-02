import { createComponentStyleDependency, css } from '@gluonjs/core';

export const asyncStateStyles = css`
  @layer organisms {
    :where(.gluon-async-state) {
      display: grid;
      gap: var(--gluon-async-state-gap, 0.75rem);
      min-inline-size: 0;
      padding: var(--gluon-async-state-padding, 1rem);
      border: var(--gluon-async-state-border, 1px solid color-mix(in srgb, currentColor 20%, transparent));
      border-radius: var(--gluon-async-state-radius, 0.75rem);
      background: var(--gluon-async-state-surface, transparent);
      color: var(--gluon-async-state-color, inherit);
    }
    :where(.gluon-async-state > :is(h2, h3, h4, h5, h6), .gluon-async-state-message, .gluon-async-state-content) { margin: 0; }
    :where(.gluon-async-state-message) { color: var(--gluon-async-state-message-color, color-mix(in srgb, currentColor 72%, transparent)); }
    :where(.gluon-async-state[data-state='loading']) .gluon-async-state-message { color: var(--gluon-async-state-loading-color, inherit); }
    :where(.gluon-async-state[data-state='error']) { border-color: var(--gluon-async-state-error-border, #b42318); }
    :where(.gluon-async-state[data-state='error']) .gluon-async-state-message { color: var(--gluon-async-state-error-color, #b42318); }
    :where(.gluon-async-state-actions) { display: flex; flex-wrap: wrap; gap: var(--gluon-async-state-action-gap, 0.75rem); }
    :where(.gluon-async-state-actions > *) { min-block-size: var(--gluon-async-state-target-size, 2.75rem); }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-async-state *) { animation: none !important; transition: none !important; } }
    @media (forced-colors: active) { :where(.gluon-async-state) { border-color: CanvasText; } :where(.gluon-async-state[data-state='error']) { border-color: Mark; } }
  }
`;

export const asyncStateStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-async-state', sheet: asyncStateStyles, layer: 'organism', order: 3, scope: 'gluon-component' });
