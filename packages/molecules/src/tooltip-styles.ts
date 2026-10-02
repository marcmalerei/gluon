import { createComponentStyleDependency, css } from '@gluonjs/core';

export const tooltipStyles = css`
  @layer molecules {
    :where(.gluon-tooltip) { position: relative; display: inline-flex; max-inline-size: 100%; color: inherit; }
    :where(.gluon-tooltip-trigger) { display: inline-flex; max-inline-size: 100%; min-block-size: 44px; align-items: center; }
    :where(.gluon-tooltip-content) { position: absolute; z-index: 20; inline-size: max-content; max-inline-size: min(20rem, calc(100vw - 2rem)); padding: var(--gluon-tooltip-padding, .5rem .625rem); border: 1px solid var(--gluon-tooltip-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-tooltip-radius, var(--gluon-radius-control, .625rem)); background: var(--gluon-tooltip-background, var(--gluon-color-text, #12312f)); color: var(--gluon-tooltip-color, var(--gluon-color-surface, #fff)); box-shadow: var(--gluon-tooltip-shadow, var(--gluon-shadow-surface)); font-size: .8125rem; line-height: 1.3; opacity: 0; pointer-events: none; transform: translateY(.25rem); transition: opacity var(--gluon-motion-duration-fast, 140ms) var(--gluon-motion-ease, ease), transform var(--gluon-motion-duration-fast, 140ms) var(--gluon-motion-ease, ease); }
    :where(.gluon-tooltip.is-block-end .gluon-tooltip-content) { inset-block-start: calc(100% + .375rem); inset-inline-start: 50%; transform: translate(-50%, .25rem); }
    :where(.gluon-tooltip.is-block-start .gluon-tooltip-content) { inset-block-end: calc(100% + .375rem); inset-inline-start: 50%; transform: translate(-50%, -.25rem); }
    :where(.gluon-tooltip.is-inline-end .gluon-tooltip-content) { inset-inline-start: calc(100% + .375rem); inset-block-start: 50%; transform: translate(.25rem, -50%); }
    :where(.gluon-tooltip.is-inline-start .gluon-tooltip-content) { inset-inline-end: calc(100% + .375rem); inset-block-start: 50%; transform: translate(-.25rem, -50%); }
    :where(.gluon-tooltip:hover .gluon-tooltip-content, .gluon-tooltip:focus-within .gluon-tooltip-content) { opacity: 1; pointer-events: auto; transform: translate(0, 0); }
    :where(.gluon-tooltip.is-block-end:hover .gluon-tooltip-content, .gluon-tooltip.is-block-end:focus-within .gluon-tooltip-content, .gluon-tooltip.is-block-start:hover .gluon-tooltip-content, .gluon-tooltip.is-block-start:focus-within .gluon-tooltip-content) { transform: translate(-50%, 0); }
    :where(.gluon-tooltip.is-inline-end:hover .gluon-tooltip-content, .gluon-tooltip.is-inline-end:focus-within .gluon-tooltip-content, .gluon-tooltip.is-inline-start:hover .gluon-tooltip-content, .gluon-tooltip.is-inline-start:focus-within .gluon-tooltip-content) { transform: translate(0, -50%); }
    :where(.gluon-tooltip[data-disabled]) .gluon-tooltip-trigger { cursor: not-allowed; opacity: .65; }
    :where(.gluon-tooltip:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: var(--gluon-focus-offset, 3px); }
    @media (forced-colors: active) { :where(.gluon-tooltip-content) { border-color: CanvasText; background: Canvas; color: CanvasText; forced-color-adjust: none; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-tooltip-content) { transition: none; } }
  }
`;

export const tooltipStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-tooltip', sheet: tooltipStyles, layer: 'molecule', order: 42, scope: 'gluon-component' });
