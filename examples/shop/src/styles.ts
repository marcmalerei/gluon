import { css } from '@gluonjs/core';

export const shopStyles = css`
  @layer shop.reset, shop.base, shop.components, shop.pages, shop.responsive;

  @layer shop.reset {
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; }
    button, input { font: inherit; }
    button, a { -webkit-tap-highlight-color: transparent; }
    img { display: block; max-width: 100%; }
  }

  @layer shop.base {
    :root {
      color: #111111;
      background: #ffffff;
      font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-synthesis: none;
      --shop-black: #111111;
      --shop-white: #ffffff;
      --shop-muted: #656565;
      --shop-rule: #d5d5d1;
      --shop-soft: #f4f4f1;
      --shop-action: #c8ff00;
      --shop-cobalt: #173f91;
      --shop-gutter: clamp(20px, 3vw, 52px);
      --shop-header: 64px;
      --shop-focus: 3px solid #173f91;
    }

    body {
      min-width: 320px;
      min-height: 100vh;
      background: var(--shop-white);
      color: var(--shop-black);
      font-size: 16px;
      line-height: 1.4;
    }

    body:has(.drawer-layer), body:has(.search-panel) { overflow: hidden; }

    a { color: inherit; text-decoration: none; }
    button { color: inherit; }
    a:focus-visible, button:focus-visible, input:focus-visible, label:has(input:focus-visible) {
      outline: var(--shop-focus);
      outline-offset: 3px;
    }

    h1, h2, h3, p { margin-top: 0; }
    main { min-height: calc(100vh - var(--shop-header)); }
    svg {
      display: block;
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }

  @layer shop.components {
    .site-header {
      position: sticky;
      top: 0;
      z-index: 30;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      height: var(--shop-header);
      padding: 0 var(--shop-gutter);
      border-bottom: 1px solid var(--shop-black);
      background: rgb(255 255 255 / 96%);
      backdrop-filter: blur(16px);
    }

    .wordmark {
      display: flex;
      min-height: 44px;
      align-items: center;
      justify-self: start;
      font-size: clamp(20px, 1.7vw, 27px);
      font-weight: 680;
      letter-spacing: -0.045em;
    }

    .desktop-nav { display: flex; gap: clamp(30px, 5vw, 78px); }
    .desktop-nav a, .header-actions button { font-size: 15px; }
    .desktop-nav a { position: relative; padding: 20px 0; }
    .desktop-nav a::after {
      position: absolute;
      right: 0;
      bottom: 14px;
      left: 0;
      height: 1px;
      content: "";
      background: currentColor;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 180ms ease;
    }
    .desktop-nav a:hover::after,
    .desktop-nav a.router-link-active::after { transform: scaleX(1); transform-origin: left; }

    .header-actions {
      justify-self: end;
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .text-action, .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    .text-action { min-height: 44px; padding: 0; gap: 9px; }
    .bag-action { min-width: 58px; border-left: 1px solid var(--shop-rule); padding-left: 24px; }
    .icon-button { width: 44px; height: 44px; padding: 10px; }
    .mobile-menu-button { display: none; }

    .primary-button {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      min-height: 54px;
      gap: 28px;
      padding: 14px 24px;
      border: 1px solid var(--shop-action);
      border-radius: 3px;
      background: var(--shop-action);
      color: var(--shop-black);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 160ms ease, border-color 160ms ease;
    }
    .primary-button:hover { border-color: var(--shop-black); background: var(--shop-white); }

    .product-rail {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border-top: 1px solid var(--shop-rule);
      border-bottom: 1px solid var(--shop-rule);
    }

    .product-card {
      min-width: 0;
      border-right: 1px solid var(--shop-rule);
      background: var(--shop-white);
      transition: background 160ms ease;
    }
    .product-card:last-child { border-right: 0; }
    .product-card:hover { background: var(--shop-soft); }
    .product-media {
      display: block;
      aspect-ratio: 1.45 / 1;
      overflow: hidden;
      background: #fbfbfa;
    }
    .product-media img { width: 100%; height: 100%; object-fit: contain; padding: 14px 9%; transition: transform 240ms ease; }
    .product-card:hover .product-media img { transform: scale(1.025); }
    .product-copy {
      display: flex;
      justify-content: space-between;
      align-items: end;
      min-height: 94px;
      padding: 18px clamp(16px, 2vw, 30px);
      border-top: 1px solid var(--shop-rule);
    }
    .product-copy > span:first-child { display: grid; gap: 5px; }
    .product-copy strong { font-size: clamp(19px, 1.8vw, 30px); font-weight: 520; letter-spacing: -0.035em; }
    .product-copy small { font-size: 14px; }
    .product-arrow { padding-bottom: 3px; transition: transform 160ms ease; }
    .product-card:hover .product-arrow { transform: translateX(5px); }

    .category-links { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid var(--shop-rule); }
    .category-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 78px;
      padding: 0 var(--shop-gutter);
      border-right: 1px solid var(--shop-rule);
      font-size: clamp(19px, 1.65vw, 26px);
      letter-spacing: -0.025em;
    }
    .category-link:last-child { border-right: 0; }
    .category-link:hover { background: var(--shop-action); }

    .site-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 100px;
      padding: 24px var(--shop-gutter);
      border-top: 1px solid var(--shop-rule);
    }
    .site-footer strong { font-size: 19px; letter-spacing: -0.03em; }
    .site-footer nav { display: flex; gap: clamp(20px, 4vw, 60px); font-size: 13px; }
    .site-footer a { display: flex; min-height: 44px; align-items: center; }
    .site-footer a:hover { text-decoration: underline; text-underline-offset: 4px; }

    .drawer-layer {
      position: fixed;
      inset: 0;
      z-index: 70;
      display: flex;
      justify-content: flex-end;
      background: rgb(17 17 17 / 32%);
      animation: layer-in 180ms ease both;
    }
    .bag-drawer, .mobile-menu {
      display: flex;
      flex-direction: column;
      width: min(520px, 100%);
      height: 100%;
      background: var(--shop-white);
      animation: drawer-in 220ms ease both;
    }
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 70px;
      padding: 10px 22px 10px 28px;
      border-bottom: 1px solid var(--shop-black);
    }
    .drawer-header h2 { margin: 0; font-size: 26px; font-weight: 540; }
    .empty-bag { display: grid; place-items: start; gap: 18px; padding: 48px 28px; }
    .empty-bag p { max-width: 260px; font-size: 28px; line-height: 1.12; letter-spacing: -0.035em; }
    .inline-link { border-bottom: 1px solid; padding-bottom: 3px; }
    .bag-lines { flex: 1; overflow: auto; }
    .bag-line { display: grid; grid-template-columns: 130px 1fr; gap: 18px; padding: 22px 28px; border-bottom: 1px solid var(--shop-rule); }
    .bag-line > img { width: 130px; aspect-ratio: 1; object-fit: contain; background: var(--shop-soft); }
    .bag-line-copy { min-width: 0; }
    .bag-line-heading { display: flex; justify-content: space-between; gap: 12px; }
    .bag-line h3 { margin-bottom: 4px; font-size: 18px; font-weight: 570; }
    .bag-line p { color: var(--shop-muted); font-size: 12px; }
    .quantity-control { display: flex; align-items: center; gap: 8px; }
    .quantity-control button:not(.remove-line) { width: 44px; height: 44px; padding: 12px; border: 1px solid var(--shop-rule); background: white; cursor: pointer; }
    .quantity-control > span { min-width: 22px; text-align: center; }
    .remove-line { min-width: 44px; min-height: 44px; margin-left: auto; padding: 9px 0; border: 0; border-bottom: 1px solid; background: transparent; font-size: 12px; cursor: pointer; }
    .bag-summary { padding: 22px 28px max(22px, env(safe-area-inset-bottom)); border-top: 1px solid var(--shop-black); }
    .bag-summary > div { display: flex; justify-content: space-between; font-size: 20px; }
    .bag-summary p { margin: 8px 0 18px; color: var(--shop-muted); font-size: 12px; }
    .bag-summary .primary-button { width: 100%; }

    .mobile-menu { width: min(440px, 100%); }
    .mobile-menu > nav { display: grid; }
    .mobile-menu > nav :is(a, button) { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 74px; padding: 0 28px; border: 0; border-bottom: 1px solid var(--shop-rule); background: transparent; color: inherit; font: inherit; font-size: 27px; text-align: left; cursor: pointer; }
    .mobile-menu > nav :is(a, button):hover { background: var(--shop-action); }
    .menu-categories { margin-top: auto; }
    .menu-categories .category-links { grid-template-columns: 1fr; }
    .menu-categories .category-link { min-height: 56px; border-right: 0; font-size: 16px; }

    .search-panel { position: fixed; inset: 0; z-index: 80; overflow: auto; background: var(--shop-white); animation: layer-in 160ms ease both; }
    .search-bar { display: grid; grid-template-columns: minmax(190px, 0.4fr) 1fr 44px; align-items: center; gap: 24px; min-height: 100px; padding: 16px var(--shop-gutter); border-bottom: 1px solid var(--shop-black); }
    .search-bar label { font-size: 24px; letter-spacing: -0.03em; }
    .search-input-wrap { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--shop-black); }
    .search-input-wrap input { width: 100%; height: 54px; border: 0; outline: 0; background: transparent; font-size: clamp(20px, 3vw, 38px); letter-spacing: -0.035em; }
    .search-results > p { padding: 22px var(--shop-gutter); margin: 0; color: var(--shop-muted); font-size: 13px; }

    @keyframes layer-in { from { opacity: 0; } }
    @keyframes drawer-in { from { transform: translateX(100%); } }
  }

  @layer shop.pages {
    .home-hero { display: grid; grid-template-columns: minmax(380px, 34%) 1fr; min-height: min(610px, calc(100vh - var(--shop-header))); border-bottom: 1px solid var(--shop-rule); }
    .hero-copy { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: clamp(40px, 6vw, 92px) var(--shop-gutter); }
    .hero-copy h1 { max-width: 620px; margin-bottom: 24px; font-size: clamp(52px, 5.3vw, 88px); font-weight: 540; line-height: 0.94; letter-spacing: -0.065em; }
    .hero-copy p { max-width: 320px; margin-bottom: 34px; font-size: clamp(18px, 1.5vw, 23px); line-height: 1.24; }
    .hero-media { overflow: hidden; }
    .hero-media img { width: 100%; height: 100%; object-fit: cover; object-position: 54% center; }

    .material-story { position: relative; display: grid; grid-template-columns: 0.8fr 1.35fr 1.1fr; min-height: 230px; overflow: hidden; background: var(--shop-black); color: var(--shop-white); }
    .material-story h2 { padding: 42px var(--shop-gutter); font-size: clamp(29px, 3vw, 48px); font-weight: 500; letter-spacing: -0.05em; }
    .material-story p { max-width: 560px; padding: 45px 30px; font-size: clamp(16px, 1.35vw, 20px); }
    .material-detail { overflow: hidden; }
    .material-detail img { width: 100%; height: 100%; object-fit: cover; object-position: 78% 70%; }

    .catalog-page { padding-bottom: 60px; }
    .catalog-heading { display: flex; align-items: end; justify-content: space-between; min-height: 280px; padding: 64px var(--shop-gutter) 42px; }
    .catalog-heading h1 { margin: 0; font-size: clamp(56px, 7vw, 112px); font-weight: 520; line-height: 0.92; letter-spacing: -0.07em; }
    .catalog-heading p { margin: 0; color: var(--shop-muted); }
    .catalog-filters { display: flex; gap: 8px; overflow: auto; padding: 0 var(--shop-gutter) 28px; }
    .catalog-filters a { display: grid; place-items: center; min-height: 44px; padding: 0 18px; border: 1px solid var(--shop-rule); white-space: nowrap; }
    .catalog-filters a:hover, .catalog-filters .is-selected { border-color: var(--shop-black); background: var(--shop-black); color: white; }
    .catalog-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--shop-rule); }
    .catalog-grid .product-media { aspect-ratio: 1.4; }
    .catalog-grid .product-card:nth-child(2n) { border-right: 0; }
    .catalog-grid .product-card { border-bottom: 1px solid var(--shop-rule); }

    .product-page { padding: 0 var(--shop-gutter) 90px; }
    .breadcrumbs { display: flex; gap: 11px; align-items: center; min-height: 66px; font-size: 13px; }
    .breadcrumbs a:hover { text-decoration: underline; text-underline-offset: 3px; }
    .mobile-product-back { display: none; }
    .product-layout { display: grid; grid-template-columns: minmax(0, 2.15fr) minmax(340px, 1fr); gap: clamp(28px, 3vw, 60px); align-items: start; }
    .product-gallery { position: relative; display: grid; grid-template-columns: 1.6fr 0.8fr; grid-template-rows: 1fr 1fr; gap: 10px; }
    .product-gallery:focus { outline: 3px solid transparent; outline-offset: -3px; }
    .product-gallery:focus::after {
      position: absolute;
      z-index: 5;
      inset: 0;
      border: var(--shop-focus);
      pointer-events: none;
      content: '';
    }
    .product-gallery figure { min-width: 0; margin: 0; overflow: hidden; background: #f6f6f4; }
    .product-gallery img { width: 100%; height: 100%; object-fit: contain; }
    .gallery-primary { grid-row: 1 / 3; aspect-ratio: 1.05 / 1; }
    .product-gallery figure:not(.gallery-primary) { aspect-ratio: 1.35; }
    .detail-crop { transform: scale(1.65); }
    .detail-top { object-position: 60% 23%; }
    .detail-base { object-position: 42% 86%; }
    .gallery-dots { display: none; }

    .product-configurator { position: sticky; top: calc(var(--shop-header) + 24px); }
    .product-title-row { display: flex; justify-content: space-between; align-items: start; gap: 20px; padding-bottom: 24px; border-bottom: 1px solid var(--shop-rule); }
    .product-title-row h1 { margin-bottom: 16px; font-size: clamp(42px, 4.3vw, 72px); font-weight: 540; line-height: 0.95; letter-spacing: -0.06em; }
    .product-title-row p { margin: 0; }
    .product-title-row > strong { font-size: 22px; font-weight: 520; white-space: nowrap; }
    .choice-group { padding: 18px 0 20px; border: 0; border-bottom: 1px solid var(--shop-rule); margin: 0; }
    .choice-group legend { margin-bottom: 12px; font-size: 14px; }
    .choice-group > div { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .choice-group label { position: relative; display: flex; align-items: center; min-height: 48px; gap: 9px; padding: 8px 10px; border: 1px solid var(--shop-rule); cursor: pointer; font-size: 13px; }
    .choice-group label:hover, .choice-group label.is-selected { border-color: var(--shop-cobalt); }
    .choice-group input { width: 17px; height: 17px; margin: 0; accent-color: var(--shop-cobalt); }
    .choice-temperature > div, .choice-cable > div { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .finish-swatch { width: 18px; height: 18px; border: 1px solid #888; border-radius: 50%; }
    .swatch-graphite { background: #313131; }
    .swatch-cobalt { background: var(--shop-cobalt); }
    .swatch-bone { background: #ebe8de; }
    .add-to-bag { width: 100%; margin-top: 20px; }
    .product-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 19px 0; margin: 0; border-bottom: 1px solid var(--shop-rule); list-style: none; font-size: 11px; }
    .product-facts li { padding-right: 8px; border-right: 1px solid var(--shop-rule); }
    .product-facts li:last-child { border-right: 0; }
    .inventory-status { min-height: 44px; display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--shop-rule); border-bottom: 1px solid var(--shop-rule); font-size: 12px; }
    .inventory-dot { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; background: var(--shop-action); box-shadow: 0 0 0 1px rgb(17 17 17 / 28%); }
    .inventory-low-stock { background: #ffb347; }
    .inventory-pending { color: var(--shop-muted); }
    .inventory-retry { min-height: 44px; border: 0; background: transparent; color: inherit; }
    .product-story { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: clamp(30px, 5vw, 90px); margin-top: 70px; padding-top: 34px; border-top: 1px solid var(--shop-black); }
    .product-story h2 { font-size: 19px; font-weight: 560; }
    .product-story p { max-width: 540px; line-height: 1.7; }
    .product-story dl { margin: 0; }
    .product-story dl div { padding: 0 0 17px; margin-bottom: 17px; border-bottom: 1px solid var(--shop-rule); }
    .product-story dt { color: var(--shop-muted); font-size: 12px; }
    .product-story dd { margin: 4px 0 0; }
    .paired-product .product-card { display: block; border: 1px solid var(--shop-rule); }
    .checkout-page { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(300px, .8fr); gap: clamp(40px, 8vw, 130px); padding: clamp(42px, 7vw, 100px) var(--shop-gutter); }
    .checkout-page h1, .order-confirmation h1, .checkout-empty h1 { font-size: clamp(42px, 7vw, 92px); line-height: .94; letter-spacing: -.055em; }
    .checkout-page form { display: grid; gap: 18px; max-width: 720px; margin-top: 42px; }
    .checkout-page label { display: grid; gap: 7px; font-size: 12px; }
    .checkout-page input { min-height: 52px; padding: 0 14px; border: 1px solid var(--shop-rule); background: white; }
    .checkout-row { display: grid; grid-template-columns: 1fr 1.5fr; gap: 14px; }
    .place-order { width: 100%; margin-top: 12px; }
    .order-summary { align-self: start; padding: 28px; border: 1px solid var(--shop-rule); }
    .order-summary h2 { margin-bottom: 24px; font-size: 22px; }
    .order-summary > div, .order-summary footer { display: flex; justify-content: space-between; gap: 20px; padding: 15px 0; border-top: 1px solid var(--shop-rule); }
    .order-summary footer { margin-top: 12px; border-color: var(--shop-black); font-size: 20px; }
    .order-confirmation, .checkout-empty { min-height: 65vh; padding: clamp(54px, 9vw, 130px) var(--shop-gutter); }
    .order-confirmation > p { max-width: 620px; margin-top: 22px; font-size: 18px; }
    .order-total { display: block; margin: 30px 0; font-size: 28px; }
    .paired-product .product-copy strong { font-size: 19px; }

    .not-found { display: grid; place-items: start; align-content: center; min-height: 70vh; padding: 70px var(--shop-gutter); }
    .not-found h1 { max-width: 900px; margin-bottom: 20px; font-size: clamp(60px, 10vw, 150px); font-weight: 520; line-height: 0.9; letter-spacing: -0.075em; }
    .not-found p { margin-bottom: 30px; font-size: 20px; }
    .policy-page { display: grid; align-content: center; justify-items: start; min-height: 72vh; padding: 70px var(--shop-gutter); }
    .policy-page h1 { margin-bottom: 28px; font-size: clamp(72px, 11vw, 170px); font-weight: 520; line-height: 0.88; letter-spacing: -0.075em; }
    .policy-page p { max-width: 680px; margin-bottom: 34px; font-size: clamp(18px, 2vw, 27px); }
  }

  @layer shop.responsive {
    @media (max-width: 980px) {
      .home-hero { grid-template-columns: minmax(320px, 43%) 1fr; }
      .product-copy strong { font-size: 20px; }
      .product-layout { grid-template-columns: 1fr; }
      .product-configurator { position: static; }
      .product-story { grid-template-columns: 1fr 1fr; }
      .paired-product { grid-column: 1 / -1; max-width: 480px; }
    }

    @media (max-width: 760px) {
      :root { --shop-header: 58px; --shop-gutter: 18px; }
      .site-header { grid-template-columns: 1fr auto; padding-right: 8px; }
      .desktop-nav, .search-action { display: none; }
      .header-actions { gap: 0; }
      .mobile-menu-button { display: inline-flex; width: auto; gap: 7px; order: -1; padding-inline: 7px; }
      .mobile-menu-button span { font-size: 13px; }
      .bag-action { padding: 0 10px 0 14px; border-left: 0; font-size: 14px; }
      .wordmark { font-size: 19px; }

      .home-hero { grid-template-columns: minmax(0, 48%) minmax(0, 52%); min-height: 336px; }
      .hero-copy { z-index: 1; padding: 24px 10px 24px var(--shop-gutter); }
      .hero-copy h1 { margin-bottom: 14px; font-size: clamp(31px, 9.5vw, 42px); line-height: 0.98; }
      .hero-copy p { margin-bottom: 18px; font-size: 13px; }
      .hero-copy .primary-button { width: 100%; min-height: 46px; gap: 8px; padding: 10px 12px; font-size: 12px; }
      .hero-copy .primary-button svg { width: 17px; }
      .hero-media img { object-position: 88% center; }

      .product-rail { display: flex; overflow: auto; scroll-snap-type: x mandatory; }
      .product-rail .product-card { flex: 0 0 68vw; scroll-snap-align: start; }
      .product-media { aspect-ratio: 1.25; }
      .product-copy { min-height: 76px; padding: 12px 14px; }
      .product-copy strong { font-size: 17px; }
      .product-copy small { font-size: 12px; }

      .material-story { grid-template-columns: 1fr; min-height: 230px; padding: 25px var(--shop-gutter); background: var(--shop-black); }
      .material-story h2 { z-index: 1; max-width: 54%; padding: 0; margin-bottom: 14px; font-size: 34px; }
      .material-story p { z-index: 1; max-width: 57%; padding: 0; font-size: 14px; }
      .material-detail { position: absolute; right: 0; bottom: 0; width: 43%; height: 100%; opacity: 0.72; }

      .category-links { grid-template-columns: 1fr; }
      .category-link { min-height: 58px; padding: 0 var(--shop-gutter); border-right: 0; border-bottom: 1px solid var(--shop-rule); font-size: 18px; }
      .category-link:last-child { border-bottom: 0; }
      .site-footer { align-items: flex-start; gap: 32px; min-height: 170px; }
      .site-footer nav { display: grid; grid-template-columns: 1fr 1fr; }

      .search-bar { grid-template-columns: 1fr 44px; gap: 10px; min-height: 108px; }
      .search-bar label { grid-column: 1 / -1; font-size: 15px; }
      .search-input-wrap input { font-size: 21px; }
      .search-results .product-rail .product-card { flex-basis: 76vw; }

      .catalog-heading { display: block; min-height: 230px; padding-top: 62px; }
      .catalog-heading h1 { margin-bottom: 18px; font-size: 59px; }
      .catalog-filters { padding-right: 0; }
      .catalog-grid { grid-template-columns: 1fr 1fr; }
      .catalog-grid .product-copy { display: block; min-height: 84px; }
      .catalog-grid .product-copy strong { font-size: 16px; }
      .catalog-grid .product-arrow { display: none; }

      .product-page { padding: 0 0 70px; }
      .breadcrumbs { display: none; }
      .mobile-product-back { display: flex; min-height: 52px; align-items: center; padding: 0 var(--shop-gutter); border-bottom: 1px solid var(--shop-rule); }
      .mobile-product-back a { display: flex; min-width: 44px; min-height: 44px; align-items: center; }
      .product-layout { display: block; }
      .product-gallery { display: flex; overflow: auto; gap: 1px; scroll-snap-type: x mandatory; background: var(--shop-rule); }
      .product-gallery figure { flex: 0 0 88%; aspect-ratio: 1 / 0.72; scroll-snap-align: center; }
      .product-gallery .gallery-primary { grid-row: auto; }
      .product-gallery figure:not(.gallery-primary) { aspect-ratio: 1 / 0.72; }
      .detail-crop { transform: none; }
      .gallery-dots { position: absolute; bottom: 12px; left: 50%; display: flex; gap: 6px; padding: 6px; transform: translateX(-50%); }
      .gallery-dots span { width: 7px; height: 7px; border-radius: 50%; background: #b8b8b5; }
      .gallery-dots .is-active { background: var(--shop-black); }
      .product-configurator { padding: 24px var(--shop-gutter) 0; }
      .product-title-row h1 { font-size: 39px; }
      .product-title-row > strong { font-size: 21px; }
      .choice-group { padding: 10px 0 12px; }
      .choice-group legend { margin-bottom: 6px; }
      .choice-group > div { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .choice-group label { min-height: 44px; }
      .choice-temperature > div, .choice-cable > div { grid-template-columns: 1fr 1fr; }
      .add-to-bag { position: sticky; bottom: 0; z-index: 12; min-height: 58px; margin: 12px calc(var(--shop-gutter) * -1) 0; width: calc(100% + var(--shop-gutter) * 2); border-radius: 0; padding-bottom: max(14px, env(safe-area-inset-bottom)); }
      .product-facts { font-size: 10px; }
      .product-story { grid-template-columns: 1fr; margin: 38px var(--shop-gutter) 0; }
      .paired-product { grid-column: auto; }
      .paired-product .product-card { max-width: 100%; }

      .bag-line { grid-template-columns: 90px 1fr; padding: 18px; }
      .bag-line > img { width: 90px; }
      .checkout-page { grid-template-columns: 1fr; padding-top: 36px; }
      .checkout-row { grid-template-columns: 1fr; }
      .order-summary { order: -1; }
    }

    @media (max-width: 390px) {
      .home-hero { grid-template-columns: minmax(0, 52%) minmax(0, 48%); }
      .hero-copy h1 { font-size: 31px; }
      .hero-copy p { font-size: 12px; }
      .hero-copy .primary-button span { max-width: 92px; text-align: left; }
      .wordmark { font-size: 17px; }
      .mobile-menu-button { padding-inline: 5px; }
      .mobile-menu-button span { font-size: 12px; }
      .catalog-grid .product-copy strong { font-size: 14px; }
      .choice-group label { padding-inline: 7px; font-size: 11px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  }
`;
