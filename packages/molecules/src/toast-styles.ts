import { createComponentStyleDependency, css } from '@gluonjs/core';

export const toastStyles = css`
  @layer molecules {
    :where(.gluon-toast-viewport) {
      position: fixed;
      z-index: 100;
      inset-block-start: max(1rem, env(safe-area-inset-top));
      inset-inline-end: max(1rem, env(safe-area-inset-right));
      display: grid;
      gap: 0.75rem;
      inline-size: min(24rem, calc(100vw - 2rem));
      pointer-events: none;
    }
    :where(.gluon-toast) {
      pointer-events: auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.5rem 1rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: var(--gluon-toast-radius, var(--gluon-radius-medium, 0.5rem));
      background: var(--gluon-toast-background, Canvas);
      color: var(--gluon-toast-color, CanvasText);
      box-shadow: var(--gluon-toast-shadow, 0 8px 30px rgb(0 0 0 / 0.16));
      overflow-wrap: anywhere;
    }
    :where(.gluon-toast.is-success) { --gluon-toast-color: #14532d; }
    :where(.gluon-toast.is-warning) { --gluon-toast-color: #5b3a00; }
    :where(.gluon-toast.is-danger) { --gluon-toast-color: #7f1d1d; }
    :where(.gluon-toast-announcement) { min-inline-size: 0; }
    :where(.gluon-toast-title) { display: block; font-weight: 700; }
    :where(.gluon-toast-message) { min-inline-size: 0; }
    :where(.gluon-toast-actions) { align-self: start; }
    :where(.gluon-toast-dismiss) {
      display: inline-grid;
      place-items: center;
      min-inline-size: 44px;
      min-block-size: 44px;
      margin: -0.625rem;
      border: 1px solid transparent;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
    }
    :where(.gluon-toast-dismiss:focus-visible) { outline: 2px solid currentColor; outline-offset: 2px; }
    @media (max-width: 480px) {
      :where(.gluon-toast-viewport) {
        inset-inline: 1rem;
        inline-size: auto;
      }
    }
    @media (forced-colors: active) {
      :where(.gluon-toast) {
        border: 2px solid CanvasText;
        background: Canvas;
        color: CanvasText;
        box-shadow: none;
      }
      :where(.gluon-toast-dismiss) { border-color: ButtonText; }
    }
    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-toast, .gluon-toast *) {
        animation: none !important;
        transition: none !important;
      }
    }
  }
`;

export const toastStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-toast',
  sheet: toastStyles,
  layer: 'molecule',
  order: 13,
  scope: 'gluon-component',
});
