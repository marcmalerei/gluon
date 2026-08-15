import { createComponentStyleDependency, css } from '@gluonjs/core';

export const avatarStyles = css`
  @layer atoms {
    :where(.gluon-avatar) {
      box-sizing: border-box;
      position: relative;
      display: inline-grid;
      inline-size: var(--gluon-avatar-size, 2.75rem);
      block-size: var(--gluon-avatar-size, 2.75rem);
      place-items: center;
      overflow: hidden;
      border: var(--gluon-avatar-border, 1px solid transparent);
      border-radius: var(--gluon-avatar-radius, 50%);
      background: var(--gluon-avatar-background, var(--gluon-color-canvas, #e5e9e8));
      color: var(--gluon-avatar-color, var(--gluon-color-text, #263432));
      font: inherit;
      font-weight: 650;
    }

    :where(.gluon-avatar__image) {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      object-fit: var(--gluon-avatar-object-fit, cover);
    }

    :where(.gluon-avatar__fallback) {
      display: grid;
      inline-size: 100%;
      block-size: 100%;
      place-items: center;
    }

    :where(.gluon-avatar.is-loading .gluon-avatar__fallback)::after {
      position: absolute;
      inset: 12.5%;
      border: 2px solid currentColor;
      border-inline-end-color: transparent;
      border-radius: 50%;
      animation: gluon-avatar-loading 0.8s linear infinite;
      content: '';
    }

    @keyframes gluon-avatar-loading {
      to { transform: rotate(1turn); }
    }

    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-avatar.is-loading .gluon-avatar__fallback)::after {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      :where(.gluon-avatar) {
        border-color: CanvasText;
        forced-color-adjust: auto;
      }
    }
  }
`;

export const avatarStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-avatar',
  sheet: avatarStyles,
  layer: 'atom',
  order: 13,
  scope: 'gluon-component',
});
