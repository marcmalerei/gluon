import { css } from '@gluonjs/core';

export const starterStyles = css`
  *, *::before, *::after { box-sizing: border-box; }
  :root { font-family: Inter, system-ui, sans-serif; color: #111; background: #fff; }
  body { margin: 0; min-width: 320px; }
  header { display: flex; min-height: 64px; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid #d7d7d2; }
  nav { display: flex; gap: 24px; }
  a { color: inherit; }
  .brand { font-weight: 700; text-decoration: none; }
  main { width: min(720px, 100%); margin: 0 auto; padding: 64px 24px; }
  button { min-height: 44px; padding: 10px 18px; border: 1px solid #111; background: #c8ff00; color: #111; font: inherit; cursor: pointer; }
  :focus-visible { outline: 3px solid #173f91; outline-offset: 3px; }
`;
