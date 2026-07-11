import { css } from '@gluonjs/core';

export const playgroundStyles = css`
  *, *::before, *::after { box-sizing: border-box; }
  :root { color: #111; background: #fff; font-family: Inter, "Helvetica Neue", Arial, sans-serif; font-synthesis: none; }
  body { margin: 0; min-width: 320px; min-height: 100vh; background: #fff; }
  button, input, textarea { color: inherit; font: inherit; }
  button { border: 0; background: none; }
  button, [role="tab"] { min-height: 44px; cursor: pointer; }
  button:focus-visible, input:focus-visible, textarea:focus-visible, [role="tab"]:focus-visible { outline: 3px solid #173f91; outline-offset: -3px; }
  .shell { display: grid; width: 100%; height: 100vh; min-height: 640px; grid-template: 64px minmax(0,1fr) auto 34px / 1fr; background: #fff; }
  .topbar { display: flex; align-items: stretch; justify-content: space-between; border-block: 1px solid #111; background: #fff; }
  .brand { display: flex; align-items: center; padding: 0 28px; font-size: clamp(20px,2vw,28px); letter-spacing: -.035em; }
  .brand strong { font-weight: 750; }
  .top-actions { display: flex; }
  .top-actions button { display: flex; min-width: 118px; align-items: center; justify-content: center; gap: 10px; padding: 0 22px; border-left: 1px solid #111; font-size: 15px; }
  .top-actions svg, .rail svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .top-actions .primary { background: #c8ff00; }
  .workbench { display: grid; min-height: 0; overflow: hidden; grid-template-columns: 164px minmax(360px,1fr) minmax(360px,1fr); }
  .rail { display: flex; flex-direction: column; border-right: 1px solid #b8b8b3; }
  .rail button { display: flex; align-items: center; gap: 14px; padding: 0 24px; text-align: left; border-bottom: 1px solid #ddd; font-size: 16px; }
  .rail button[aria-selected="true"] { color: #0648e8; box-shadow: inset 5px 0 #0648e8; }
  .panel { min-width: 0; min-height: 0; border-right: 1px solid #8c8c88; }
  .panel-heading { display: flex; height: 52px; align-items: center; justify-content: space-between; padding: 0 28px; border-bottom: 1px solid #8c8c88; font-weight: 650; }
  .editor-wrap { display: grid; height: calc(100% - 52px); min-height: 450px; grid-template-columns: 54px 1fr; }
  .line-numbers { padding: 20px 12px; color: #777; background: #fafafa; border-right: 1px solid #e1e1de; font: 14px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right; white-space: pre; }
  textarea { width: 100%; height: 100%; resize: none; padding: 20px 24px; border: 0; background: #fff; font: 14px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; tab-size: 2; }
  .preview { display: grid; min-height: 450px; place-items: center; padding: 40px; background: #fdfdfd; }
  gluon-playground-preview { display: block; width: min(430px,100%); }
  .preview-error { margin: 0; padding: 14px 28px; border-top: 1px solid #111; color: #a40000; font: 13px/1.5 ui-monospace, monospace; }
  .diagnostics { border-top: 1px solid #111; }
  .diagnostic-head { display: flex; min-height: 50px; align-items: center; justify-content: space-between; padding: 0 28px; }
  .diagnostic-head h2 { margin: 0; font-size: 18px; }
  .diagnostic-row { display: grid; width: 100%; grid-template-columns: minmax(250px,1fr) 180px 2fr; align-items: center; gap: 20px; min-height: 58px; padding: 8px 28px; border-top: 1px solid #c9c9c5; text-align: left; }
  .diagnostic-row code { color: #0648e8; font: 13px/1.3 ui-monospace, monospace; }
  .diagnostic-row small { color: #666; }
  .status { display: flex; align-items: center; gap: 30px; padding: 0 26px; border-top: 1px solid #111; font-size: 12px; }
  .ready::before { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; background: #52ad2c; content: ""; }
  .reference { display: grid; height: 100%; min-height: 0; overflow: hidden; grid-column: 2 / 4; grid-template-columns: 370px 1fr; }
  .reference-index { min-height: 0; padding: 28px; border-right: 1px solid #b8b8b3; overflow: auto; }
  .reference-index input { width: 100%; min-height: 48px; margin-bottom: 20px; padding: 0 15px; border: 1px solid #b8b8b3; }
  .code-list { display: grid; }
  .code-list button { padding: 13px 14px; border-bottom: 1px solid #ddd; text-align: left; font: 12px/1.3 ui-monospace, monospace; }
  .code-list button[aria-current="true"] { background: #0648e8; color: #fff; }
  .reference-detail { min-height: 0; padding: 38px clamp(30px,5vw,76px); overflow: auto; }
  .reference-detail h1 { margin: 0 0 34px; color: #0648e8; font: 600 clamp(21px,2vw,30px)/1.2 ui-monospace, monospace; }
  .reference-detail section { padding: 22px 0; border-top: 1px solid #c9c9c5; }
  .reference-detail h2 { margin: 0 0 12px; color: #0648e8; font-size: 15px; }
  .reference-detail p { margin: 0; max-width: 76ch; line-height: 1.6; }
  .examples { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .examples pre { min-height: 130px; margin: 8px 0 0; padding: 18px; overflow: auto; border: 1px solid #b8b8b3; font: 12px/1.6 ui-monospace, monospace; }
  .toast { position: fixed; top: 76px; right: 16px; padding: 12px 16px; background: #111; color: #fff; z-index: 10; }
  @media (max-height: 800px) and (min-width: 901px) {
    .shell { grid-template-rows: 64px minmax(330px,1fr) auto 34px; }
    .editor-wrap, .preview { min-height: 330px; }
    .diagnostic-row { min-height: 48px; }
  }
  @media (max-width: 900px) {
    .shell { height: auto; min-height: 100vh; grid-template-rows: auto auto auto 34px; }
    .topbar { flex-wrap: wrap; }
    .brand { min-height: 58px; flex: 1 0 100%; border-bottom: 1px solid #111; }
    .top-actions { width: 100%; }
    .top-actions button { flex: 1; min-width: 0; padding: 0 8px; }
    .workbench { grid-template-columns: 1fr; }
    .rail { flex-direction: row; border-right: 0; border-bottom: 1px solid #111; }
    .rail button { flex: 1; padding: 0 12px; text-align: center; }
    .rail button[aria-selected="true"] { box-shadow: inset 0 -4px #0648e8; }
    .panel { border-right: 0; border-bottom: 1px solid #111; }
    .preview-panel { display: block; }
    .preview { min-height: 360px; }
    .reference { grid-column: 1; grid-template-columns: 1fr; }
    .reference-index { max-height: 330px; border-right: 0; border-bottom: 1px solid #111; }
    .examples { grid-template-columns: 1fr; }
    .diagnostic-row { grid-template-columns: 1fr; gap: 4px; }
    .status { gap: 16px; }
  }
  @media (max-width: 520px) {
    .top-actions button { font-size: 13px; }
    .top-actions svg, .rail svg { display: none; }
    .workbench { min-width: 0; }
    .editor-wrap { min-height: 390px; grid-template-columns: 42px 1fr; }
    textarea { padding: 16px 12px; font-size: 12px; }
    .preview { padding: 24px 18px; }
    .diagnostic-row { padding-inline: 18px; }
  }
`;
