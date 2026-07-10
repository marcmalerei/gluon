import { css } from '../styles/index.js';

export const moleculeStyles = css`
  @layer molecules {
    :where(.gluon-card) {
      background: white;
      border: 1px solid #d9e4e2;
      border-radius: 1rem;
      color: #12312f;
      overflow: clip;
    }

    :where(.gluon-card-header) {
      align-items: start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem 1rem 0;
    }

    :where(.gluon-card-title, .gluon-card-subtitle) { margin: 0; }
    :where(.gluon-card-subtitle) { color: #5f7471; margin-top: 0.25rem; }
    :where(.gluon-card-body) { padding: 1rem; }
    :where(.gluon-card.is-success) { border-color: #5fb69c; }
    :where(.gluon-card.is-warning) { border-color: #d9a441; }
    :where(.gluon-card.is-danger) { border-color: #d56a6a; }

    :where(.gluon-form-field) {
      display: grid;
      gap: 0.375rem;
    }

    :where(.gluon-form-helper) {
      color: #5f7471;
      font-size: 0.8125rem;
    }
  }
`;
