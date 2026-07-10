import { css } from '../styles/index.js';

export const organismStyles = css`
  @layer organisms {
    :where(.gluon-app-shell) {
      display: grid;
      min-block-size: 100dvb;
      grid-template-rows: auto 1fr auto;
    }

    :where(.gluon-app-shell-layout) {
      display: grid;
      grid-template-columns: minmax(12rem, 18rem) minmax(0, 1fr);
    }

    :where(.gluon-app-shell-header, .gluon-app-shell-footer) {
      padding: 1rem;
    }

    :where(.gluon-app-shell-navigation, .gluon-app-shell-main) {
      padding: 1rem;
    }

    @media (max-width: 48rem) {
      :where(.gluon-app-shell-layout) { grid-template-columns: 1fr; }
    }
  }
`;
