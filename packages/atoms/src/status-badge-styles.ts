import { createComponentStyleDependency, css } from '@gluonjs/core';

export const statusBadgeStyles = css`
  @layer atoms {
    :where(.gluon-status-badge) {
      box-sizing: border-box;
      display: inline-flex;
      max-inline-size: 100%;
      align-items: center;
      border: 1px solid var(--gluon-status-badge-border, var(--gluon-color-rule, #b8c9c6));
      border-radius: 999px;
      background: var(--gluon-status-badge-background, var(--gluon-color-canvas, #e5e9e8));
      color: var(--gluon-status-badge-color, var(--gluon-color-text, #263432));
      font-size: 0.75rem;
      font-weight: 650;
      line-height: 1.25;
      overflow-wrap: anywhere;
      padding-block: 0.25rem;
      padding-inline: 0.625rem;
      text-align: start;
    }
    :where(.gluon-status-badge.is-info) {
      --gluon-status-badge-background: #e7eefc;
      --gluon-status-badge-border: #9fb4e2;
      --gluon-status-badge-color: #173f91;
    }
    :where(.gluon-status-badge.is-success) {
      --gluon-status-badge-background: #e2f2e8;
      --gluon-status-badge-border: #8bc7a3;
      --gluon-status-badge-color: #17633a;
    }
    :where(.gluon-status-badge.is-warning) {
      --gluon-status-badge-background: #fff0c7;
      --gluon-status-badge-border: #d7ad45;
      --gluon-status-badge-color: #6b4900;
    }
    :where(.gluon-status-badge.is-danger) {
      --gluon-status-badge-background: #f8e5e5;
      --gluon-status-badge-border: #daa0a0;
      --gluon-status-badge-color: #8c1d1d;
    }
    @media (forced-colors: active) {
      :where(.gluon-status-badge) {
        border-color: CanvasText;
        background: Canvas;
        color: CanvasText;
        forced-color-adjust: none;
      }
    }
  }
`;

export const statusBadgeStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-status-badge',
  sheet: statusBadgeStyles,
  layer: 'atom',
  order: 11,
  scope: 'gluon-component',
});
