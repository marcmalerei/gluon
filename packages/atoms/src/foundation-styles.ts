import { createComponentStyleDependency, css } from '@gluonjs/core';

export const foundationStyles = css`
  @layer atoms {
    :where(.gluon-heading) {
      margin: 0;
      color: var(--gluon-color-text, inherit);
      font-family: var(--gluon-font-family-display, var(--gluon-font-family, inherit));
      line-height: 1.1;
      text-wrap: balance;
    }
    :where(.gluon-heading[data-gluon-level="1"]) { font-size: clamp(2rem, 5vw, 4rem); }
    :where(.gluon-heading[data-gluon-level="2"]) { font-size: clamp(1.75rem, 4vw, 3rem); }
    :where(.gluon-heading[data-gluon-level="3"]) { font-size: clamp(1.5rem, 3vw, 2.25rem); }
    :where(.gluon-heading[data-gluon-level="4"]) { font-size: 1.5rem; }
    :where(.gluon-heading[data-gluon-level="5"]) { font-size: 1.25rem; }
    :where(.gluon-heading[data-gluon-level="6"]) { font-size: 1rem; }
    :where(.gluon-text) { color: var(--gluon-text-color, var(--gluon-color-text, inherit)); line-height: var(--gluon-line-height, 1.5); }
    :where(.gluon-text.is-muted) { color: var(--gluon-color-muted, currentcolor); }
    :where(.gluon-text.is-danger) { color: var(--gluon-color-danger, currentcolor); }
    :where(.gluon-link) { color: var(--gluon-link-color, var(--gluon-color-action, currentcolor)); text-underline-offset: 0.18em; }
    :where(.gluon-link):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, currentcolor); outline-offset: var(--gluon-focus-offset, 3px); }
    :where(.gluon-image) { display: block; max-inline-size: 100%; }
    :where(.gluon-badge) { display: inline-flex; align-items: center; min-block-size: 1.5rem; border: 1px solid var(--gluon-badge-border, var(--gluon-color-rule, currentcolor)); border-radius: var(--gluon-radius-pill, 999px); background: var(--gluon-badge-background, var(--gluon-color-surface, transparent)); color: var(--gluon-badge-color, var(--gluon-color-text, currentcolor)); font-size: 0.75rem; font-weight: 650; line-height: 1; padding-inline: 0.625rem; }
    :where(.gluon-badge.is-info) { --gluon-badge-background: var(--gluon-color-action-soft, #e6f4f1); --gluon-badge-color: var(--gluon-color-info, #173f91); }
    :where(.gluon-badge.is-success) { --gluon-badge-background: color-mix(in srgb, var(--gluon-color-success, #17633a) 12%, transparent); --gluon-badge-color: var(--gluon-color-success, #17633a); }
    :where(.gluon-badge.is-warning) { --gluon-badge-background: color-mix(in srgb, var(--gluon-color-warning, #6b4900) 14%, transparent); --gluon-badge-color: var(--gluon-color-warning, #6b4900); }
    :where(.gluon-badge.is-danger) { --gluon-badge-background: color-mix(in srgb, var(--gluon-color-danger, #a52222) 12%, transparent); --gluon-badge-color: var(--gluon-color-danger, #a52222); }
    :where(.gluon-spinner) { display: inline-block; inline-size: 1em; block-size: 1em; border: 0.16em solid color-mix(in srgb, currentcolor 25%, transparent); border-block-start-color: currentcolor; border-radius: 50%; animation: gluon-spinner 700ms linear infinite; }
    :where(.gluon-skeleton) { display: block; inline-size: var(--gluon-skeleton-width, 100%); min-block-size: var(--gluon-skeleton-height, 1rem); border-radius: var(--gluon-radius-control, 0.625rem); background: linear-gradient(100deg, var(--gluon-color-rule, #b8c9c6) 30%, var(--gluon-color-surface-raised, #fff) 50%, var(--gluon-color-rule, #b8c9c6) 70%); background-size: 200% 100%; animation: gluon-skeleton 1.2s ease-in-out infinite; }
    :where(.gluon-meter) { display: block; inline-size: 100%; block-size: 0.625rem; accent-color: var(--gluon-meter-color, var(--gluon-color-action, currentcolor)); }
    @keyframes gluon-spinner { to { transform: rotate(360deg); } }
    @keyframes gluon-skeleton { to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-spinner, .gluon-skeleton) { animation: none; } }
  }
`;

export const foundationStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-foundation',
  sheet: foundationStyles,
  layer: 'atom',
  order: 20,
  scope: 'gluon-component',
});
