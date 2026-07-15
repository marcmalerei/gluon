import { css } from '@gluonjs/core';

export const virtualizerExampleStyles = css`
  :root { color: #111; background: #fff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; }
  button { min-height: 44px; border: 1px solid #111; background: #fff; padding: 0 16px; font: inherit; cursor: pointer; }
  button:hover, button:focus-visible { background: #c8ff00; outline: 3px solid #1649ff; outline-offset: 2px; }
  .example-shell { min-height: 100vh; padding: clamp(20px, 4vw, 64px); }
  .example-header { display: grid; grid-template-columns: 1fr auto; gap: 32px; align-items: end; border-bottom: 1px solid #111; padding-bottom: 24px; }
  .eyebrow { margin: 0 0 12px; color: #1649ff; font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 0; max-width: 820px; font-size: clamp(42px, 7vw, 96px); font-weight: 520; line-height: .92; letter-spacing: -.065em; }
  .controls { display: flex; flex-wrap: wrap; justify-content: end; gap: 8px; }
  .status { display: flex; justify-content: space-between; gap: 20px; margin: 22px 0 12px; color: #555; }
  .inventory-viewport { height: min(64vh, 680px); border-block: 1px solid #111; scroll-padding-block: 8px; }
  [role="row"] { align-items: stretch; }
  [role="gridcell"], [role="listitem"] { min-width: 0; }
  .inventory-card { min-height: 116px; height: 100%; border: 1px solid #d7d7d2; padding: 18px; background: #f7f7f2; }
  .inventory-card:focus-within { border-color: #1649ff; }
  .inventory-card a { display: block; min-height: 44px; color: inherit; text-decoration: none; }
  .inventory-card strong { display: block; font-size: 18px; }
  .inventory-card span { display: block; margin-top: 8px; color: #555; }
  .inventory-card[data-featured="true"] { min-height: 148px; background: #1649ff; color: #fff; }
  .inventory-card[data-featured="true"] span { color: #fff; }
  @media (max-width: 760px) {
    .example-header { grid-template-columns: 1fr; }
    .controls { justify-content: start; }
    .inventory-viewport { height: 58vh; }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
`;
