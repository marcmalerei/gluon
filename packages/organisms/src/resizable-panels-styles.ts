import { createComponentStyleDependency, css } from '@gluonjs/core';

export const resizablePanelsStyles = css`
  @layer organisms {
    :where(.gluon-resizable-panels) { --gluon-resizable-panels-gap: 0; --gluon-resizable-panels-border: var(--gluon-color-rule, #b8c9c6); --gluon-resizable-panels-background: var(--gluon-color-surface, #fff); display: grid; grid-template-columns: var(--gluon-resizable-panels-template); min-inline-size: 0; min-block-size: 0; overflow: hidden; border: 1px solid var(--gluon-resizable-panels-border); border-radius: var(--gluon-resizable-panels-radius, .625rem); background: var(--gluon-resizable-panels-background); color: var(--gluon-resizable-panels-color, var(--gluon-color-text, #12312f)); }
    :where(.gluon-resizable-panels.is-vertical) { grid-template-columns: 1fr; grid-template-rows: var(--gluon-resizable-panels-template); }
    :where(.gluon-resizable-panels-panel) { display: grid; min-inline-size: 0; min-block-size: 0; overflow: hidden; }
    :where(.gluon-resizable-panels-panel-header) { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-block-size: 2.75rem; padding: .5rem .75rem; border-block-end: 1px solid var(--gluon-resizable-panels-border); }
    :where(.gluon-resizable-panels-panel-label) { min-inline-size: 0; overflow-wrap: anywhere; font-weight: 650; }
    :where(.gluon-resizable-panels-panel-content) { min-inline-size: 0; min-block-size: 0; overflow: auto; padding: var(--gluon-resizable-panels-panel-padding, 1rem); }
    :where(.gluon-resizable-panels-panel.is-collapsed .gluon-resizable-panels-panel-content) { display: none; }
    :where(.gluon-resizable-panels-toggle) { min-block-size: 2.75rem; padding: .5rem .625rem; border: 1px solid var(--gluon-resizable-panels-border); border-radius: var(--gluon-resizable-panels-control-radius, .375rem); color: inherit; background: transparent; cursor: pointer; }
    :where(.gluon-resizable-panels-separator) { position: relative; z-index: 1; display: grid; place-items: center; min-block-size: 2.75rem; min-inline-size: 2.75rem; border: 0; background: var(--gluon-resizable-panels-separator-background, color-mix(in srgb, currentColor 7%, transparent)); cursor: col-resize; touch-action: none; }
    :where(.gluon-resizable-panels.is-vertical .gluon-resizable-panels-separator) { cursor: row-resize; }
    :where(.gluon-resizable-panels-separator-grip) { inline-size: .25rem; block-size: 2rem; border-radius: 999px; background: currentColor; opacity: .38; }
    :where(.gluon-resizable-panels.is-vertical .gluon-resizable-panels-separator-grip) { inline-size: 2rem; block-size: .25rem; }
    :where(.gluon-resizable-panels-toggle:focus-visible, .gluon-resizable-panels-separator:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) { :where(.gluon-resizable-panels, .gluon-resizable-panels.is-vertical) { grid-template-columns: 1fr; grid-template-rows: var(--gluon-resizable-panels-template); } :where(.gluon-resizable-panels-separator) { cursor: row-resize; } :where(.gluon-resizable-panels-separator-grip) { inline-size: 2rem; block-size: .25rem; } }
    @media (forced-colors: active) { :where(.gluon-resizable-panels, .gluon-resizable-panels-panel-header, .gluon-resizable-panels-toggle) { border-color: CanvasText; } :where(.gluon-resizable-panels-separator) { background: Canvas; border-block: 1px solid CanvasText; } :where(.gluon-resizable-panels-separator-grip) { background: CanvasText; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-resizable-panels, .gluon-resizable-panels *) { animation: none !important; scroll-behavior: auto !important; transition: none !important; } }
  }
`;

export const resizablePanelsStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-resizable-panels', sheet: resizablePanelsStyles, layer: 'organism', order: 2, scope: 'gluon-component' });
