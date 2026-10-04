import { createComponentStyleDependency, css } from '@gluonjs/core';

export const notificationCenterStyles = css`
  @layer organisms {
    :where(.gluon-notification-center) { display: grid; gap: var(--gluon-notification-center-gap, .75rem); min-inline-size: 0; color: var(--gluon-notification-center-color, inherit); }
    :where(.gluon-notification-center h2, .gluon-notification-center h3, .gluon-notification-center p) { margin: 0; overflow-wrap: anywhere; }
    :where(.gluon-notification-center-trigger) { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-block-size: var(--gluon-notification-center-target-size, 2.75rem); min-inline-size: var(--gluon-notification-center-target-size, 2.75rem); padding: .5rem .75rem; border: 1px solid var(--gluon-notification-center-trigger-border, currentColor); border-radius: var(--gluon-notification-center-radius, .5rem); background: var(--gluon-notification-center-trigger-background, transparent); color: inherit; cursor: pointer; font: inherit; }
    :where(.gluon-notification-center-count) { display: inline-grid; min-inline-size: 1.5rem; min-block-size: 1.5rem; place-items: center; padding-inline: .25rem; border-radius: 999px; background: var(--gluon-notification-center-count-background, currentColor); color: var(--gluon-notification-center-count-color, Canvas); font-size: .8em; font-weight: 700; }
    :where(.gluon-notification-center-panel) { display: grid; gap: var(--gluon-notification-center-panel-gap, 1rem); min-inline-size: 0; padding: var(--gluon-notification-center-panel-padding, 1rem); border: 1px solid var(--gluon-notification-center-border, currentColor); border-radius: var(--gluon-notification-center-radius, .5rem); background: var(--gluon-notification-center-background, Canvas); box-shadow: var(--gluon-notification-center-shadow, 0 8px 30px rgb(0 0 0 / .12)); }
    :where(.gluon-notification-center-list) { display: grid; gap: var(--gluon-notification-center-list-gap, .75rem); max-block-size: var(--gluon-notification-center-list-max-block-size, min(36rem, 70vh)); overflow: auto; margin: 0; padding: 0; list-style: none; }
    :where(.gluon-notification-center-item-content) { display: grid; gap: .5rem; min-inline-size: 0; padding: var(--gluon-notification-center-item-padding, .75rem); border: 1px solid var(--gluon-notification-center-item-border, currentColor); border-inline-start: .25rem solid var(--gluon-notification-center-item-accent, currentColor); border-radius: var(--gluon-notification-center-item-radius, .375rem); background: var(--gluon-notification-center-item-background, transparent); }
    :where(.gluon-notification-center-item-header) { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem 1rem; }
    :where(.gluon-notification-center-item-title) { font-weight: 700; }
    :where(.gluon-notification-center-item-timestamp, .gluon-notification-center-item-meta) { color: var(--gluon-notification-center-muted, currentColor); font-size: .9em; }
    :where(.gluon-notification-center-item-body, .gluon-notification-center-empty) { overflow-wrap: anywhere; }
    :where(.gluon-notification-center-actions) { display: flex; flex-wrap: wrap; gap: .5rem; }
    :where(.gluon-notification-center-action) { min-block-size: var(--gluon-notification-center-action-size, 2.75rem); min-inline-size: var(--gluon-notification-center-action-size, 2.75rem); padding: .4rem .65rem; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; font: inherit; }
    :where(.gluon-notification-center-item.is-info) { --gluon-notification-center-item-accent: var(--gluon-notification-center-info, Highlight); }
    :where(.gluon-notification-center-item.is-success) { --gluon-notification-center-item-accent: var(--gluon-notification-center-success, green); }
    :where(.gluon-notification-center-item.is-warning) { --gluon-notification-center-item-accent: var(--gluon-notification-center-warning, darkorange); }
    :where(.gluon-notification-center-item.is-danger) { --gluon-notification-center-item-accent: var(--gluon-notification-center-danger, crimson); }
    :where(.gluon-notification-center-item.is-unread .gluon-notification-center-item-title) { font-weight: 800; }
    :where(.gluon-notification-center :is(button, a):focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) { :where(.gluon-notification-center-panel) { inline-size: min(100%, 32rem); } }
    @media (forced-colors: active) { :where(.gluon-notification-center-trigger, .gluon-notification-center-panel, .gluon-notification-center-item-content, .gluon-notification-center-action) { border-color: CanvasText; background: Canvas; color: CanvasText; box-shadow: none; } :where(.gluon-notification-center-count) { border: 1px solid CanvasText; background: Canvas; color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-notification-center, .gluon-notification-center *) { animation: none !important; transition: none !important; } }
  }
`;

export const notificationCenterStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-notification-center', sheet: notificationCenterStyles, layer: 'organism', order: 18, scope: 'gluon-component' });
