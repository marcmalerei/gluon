import { createComponentStyleDependency, css } from '@gluonjs/core';

export const progressStyles = css`
  @layer atoms {
    :where(.gluon-progress) {
      appearance: none;
      display: block;
      inline-size: var(--gluon-progress-width, 12rem);
      max-inline-size: 100%;
      block-size: var(--gluon-progress-height, 0.625rem);
      overflow: hidden;
      border: 1px solid var(--gluon-progress-track-border, var(--gluon-color-rule, #b8c9c6));
      border-radius: 999px;
      background: var(--gluon-progress-track, var(--gluon-color-canvas, #e5e9e8));
      accent-color: var(--gluon-progress-value, var(--gluon-color-action, #087f7b));
    }
    :where(.gluon-progress.is-full-width) { inline-size: 100%; }
    .gluon-progress::-webkit-progress-bar { background: var(--gluon-progress-track, var(--gluon-color-canvas, #e5e9e8)); }
    .gluon-progress::-webkit-progress-value { background: var(--gluon-progress-value, var(--gluon-color-action, #087f7b)); }
    .gluon-progress:indeterminate::-webkit-progress-bar { background: linear-gradient(90deg, var(--gluon-progress-track, #e5e9e8) 0 30%, var(--gluon-progress-value, #087f7b) 30% 60%, var(--gluon-progress-track, #e5e9e8) 60% 100%); background-size: 200% 100%; }
    .gluon-progress::-moz-progress-bar { background: var(--gluon-progress-value, var(--gluon-color-action, #087f7b)); }
    :where(.gluon-progress:indeterminate) { background: linear-gradient(90deg, var(--gluon-progress-track, #e5e9e8) 0 30%, var(--gluon-progress-value, #087f7b) 30% 60%, var(--gluon-progress-track, #e5e9e8) 60% 100%); background-size: 200% 100%; animation: gluon-progress-indeterminate 1.2s linear infinite; }
    @keyframes gluon-progress-indeterminate { to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-progress) { animation: none; background-position: 50% 0; } }
    @media (forced-colors: active) { :where(.gluon-progress) { appearance: auto; forced-color-adjust: auto; } }
  }
`;

export const progressStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-progress',
  sheet: progressStyles,
  layer: 'atom',
  order: 10,
  scope: 'gluon-component',
});
