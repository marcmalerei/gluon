import { css } from '../styles/index.js';

export const atomStyles = css`
  @layer atoms {
    :where(.gluon-icon) {
      display: inline-block;
      flex: none;
      vertical-align: middle;
    }

    :where(.gluon-button) {
      appearance: none;
      border: 1px solid transparent;
      border-radius: 0.625rem;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
      line-height: 1;
      padding: 0.75rem 1rem;
    }

    :where(.gluon-button.is-primary) {
      background: #087f7b;
      color: white;
    }

    :where(.gluon-button.is-secondary) {
      background: #e6f4f1;
      color: #075e5b;
    }

    :where(.gluon-button.is-ghost) {
      background: transparent;
      border-color: currentcolor;
      color: inherit;
    }

    :where(.gluon-button.is-small) { padding: 0.5rem 0.75rem; }
    :where(.gluon-button.is-large) { padding: 0.875rem 1.25rem; }
    :where(.gluon-button:disabled) { cursor: not-allowed; opacity: 0.55; }

    :where(.gluon-input) {
      background: white;
      border: 1px solid #b8c9c6;
      border-radius: 0.5rem;
      color: inherit;
      font: inherit;
      padding: 0.675rem 0.75rem;
    }

    :where(.gluon-label) {
      font-size: 0.875rem;
      font-weight: 650;
    }
  }
`;
