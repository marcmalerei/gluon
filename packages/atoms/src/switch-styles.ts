import { createComponentStyleDependency, css } from '@gluonjs/core';

export const switchStyles = css`
  @layer atoms {
    :where(.gluon-switch) {
      appearance: none;
      box-sizing: border-box;
      position: relative;
      inline-size: 2.75rem;
      block-size: 1.5rem;
      flex: none;
      margin: 0;
      border: 1px solid var(--gluon-switch-border-color, var(--gluon-color-rule, #b8c9c6));
      border-radius: 999px;
      background: var(--gluon-switch-track, var(--gluon-color-canvas, #e5e9e8));
      cursor: pointer;
      transition: background-color 140ms ease, border-color 140ms ease;
    }
    :where(.gluon-switch)::before {
      content: '';
      position: absolute;
      inset-block-start: 2px;
      inset-inline-start: 2px;
      inline-size: 1.125rem;
      block-size: 1.125rem;
      border-radius: 50%;
      background: var(--gluon-switch-thumb, var(--gluon-color-surface, white));
      box-shadow: 0 1px 2px rgb(0 0 0 / 24%);
      transition: transform 140ms ease;
    }
    :where(.gluon-switch:checked) {
      border-color: var(--gluon-switch-on, var(--gluon-color-action, #087f7b));
      background: var(--gluon-switch-on, var(--gluon-color-action, #087f7b));
    }
    :where(.gluon-switch:checked)::before { transform: translateX(1.25rem); }
    :where(.gluon-switch:dir(rtl):checked)::before { transform: translateX(-1.25rem); }
    :where(.gluon-switch:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-switch):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-switch, .gluon-switch::before) { transition: none; } }
    @media (forced-colors: active) {
      :where(.gluon-switch) { appearance: auto; accent-color: AccentColor; }
      :where(.gluon-switch)::before { content: none; }
    }
  }
`;

export const switchStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-switch',
  sheet: switchStyles,
  layer: 'atom',
  order: 8,
  scope: 'gluon-component',
});
