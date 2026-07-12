import { css } from '@gluonjs/core';

export const vueHostStyles = css`
  body { min-width: 320px; }
  .vue-migration-host { min-height: 100vh; padding: clamp(24px, 5vw, 72px); }
  .vue-host-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 32px;
    padding-bottom: clamp(28px, 5vw, 64px);
    border-bottom: 1px solid var(--shop-black);
  }
  .vue-host-header h1 {
    max-width: 920px;
    margin: 0;
    font-size: clamp(42px, 7vw, 104px);
    font-weight: 520;
    line-height: 0.92;
    letter-spacing: -0.065em;
  }
  .eyebrow { margin-bottom: 14px; color: var(--shop-cobalt); font-size: 12px; font-weight: 680; letter-spacing: 0.08em; text-transform: uppercase; }
  .host-action,
  .host-submit {
    min-height: 48px;
    padding: 11px 16px;
    border: 1px solid var(--shop-black);
    background: var(--shop-white);
    cursor: pointer;
  }
  .host-action:hover,
  .host-submit:hover { background: var(--shop-action); }
  .vue-host-layout {
    display: grid;
    grid-template-columns: minmax(340px, 1fr) minmax(260px, 0.62fr);
    gap: clamp(36px, 8vw, 128px);
    padding-top: clamp(36px, 6vw, 82px);
  }
  .vue-host-layout form { min-width: 0; }
  .vue-host-layout .product-configurator { position: static; }
  .vue-host-layout .product-title-row h2 {
    margin: 0 0 16px;
    font-size: clamp(40px, 5vw, 74px);
    font-weight: 540;
    line-height: 0.95;
    letter-spacing: -0.06em;
  }
  .host-submit { width: 100%; margin-top: 16px; }
  .vue-host-evidence { align-self: start; padding: 28px; border: 1px solid var(--shop-rule); }
  .vue-host-evidence h2 { margin-bottom: 28px; font-size: clamp(28px, 3vw, 44px); font-weight: 540; letter-spacing: -0.04em; }
  .vue-host-evidence dl { margin: 0; }
  .vue-host-evidence dl div { padding: 16px 0; border-top: 1px solid var(--shop-rule); }
  .vue-host-evidence dt { margin-bottom: 5px; color: var(--shop-muted); font-size: 12px; }
  .vue-host-evidence dd { margin: 0; overflow-wrap: anywhere; }

  @media (max-width: 760px) {
    .vue-migration-host { padding: 20px 18px 48px; }
    .vue-host-header { grid-template-columns: 1fr; }
    .vue-host-header h1 { font-size: 45px; }
    .host-action { width: 100%; }
    .vue-host-layout { grid-template-columns: 1fr; padding-top: 32px; }
    .vue-host-layout .product-title-row h2 { font-size: 39px; }
    .vue-host-evidence { padding: 22px 18px; }
  }
`;
