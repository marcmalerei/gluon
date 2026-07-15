import { css } from '@gluonjs/core';

export const signalsExampleStyles = css`
  :root { color: #111; background: #fff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; }
  main { min-height: 100vh; padding: clamp(20px, 6vw, 84px); }
  .eyebrow { margin: 0 0 12px; color: #1649ff; font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h1 { max-width: 960px; margin: 0 0 clamp(48px, 8vw, 110px); font-size: clamp(46px, 8vw, 112px); font-weight: 520; line-height: .9; letter-spacing: -.065em; }
  section { display: grid; grid-template-columns: minmax(180px, 1fr) 1fr auto; gap: 24px; align-items: center; border-top: 1px solid #111; padding: 22px 0; }
  h2, p { margin: 0; }
  p { font-size: clamp(18px, 2.2vw, 30px); }
  button { min-height: 48px; border: 1px solid #111; background: #c8ff00; padding: 0 18px; color: #111; font: inherit; cursor: pointer; }
  button:focus-visible { outline: 3px solid #1649ff; outline-offset: 3px; }
  @media (max-width: 720px) { section { grid-template-columns: 1fr; } button { width: 100%; } }
`;
