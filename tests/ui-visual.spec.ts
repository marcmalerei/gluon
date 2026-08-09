import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import {
  Button,
  Select,
  installUi,
} from '@gluonjs/atoms';
import {
  adoptStyles,
  css,
  render,
} from '../src/index.js';
import { Card, FormField } from '@gluonjs/molecules';
import { AppShell } from '@gluonjs/organisms';
import { Listbox, q } from '@gluonjs/quarks';

test('matches the stable light-theme UI composition', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; }
      [data-testid="ui-visual"] { inline-size: 320px; block-size: 500px; overflow: hidden; }
      .gluon-app-shell { min-block-size: 500px; }
      .gluon-app-shell-layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .gluon-app-shell-header, .gluon-app-shell-footer { background: #e6f4f1; }
      .gluon-app-shell-header, .gluon-app-shell-footer, .gluon-app-shell-navigation, .gluon-app-shell-main { padding: 12px; }
      .gluon-input { inline-size: 100%; }
      [role="listbox"] { display: grid; gap: 2px; padding: 3px; border: 1px solid #b8c9c6; }
      [role="option"] { min-block-size: 32px; padding: 7px; }
      [role="option"][aria-selected="true"] { background: #e6f4f1; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.div({
    data: { testid: 'ui-visual' },
    children: AppShell({
      header: q.strong({ children: 'GLUON UI' }),
      navigation: q.a({ href: '#profile', children: 'Profile' }),
      children: Card({
        attributes: { id: 'profile' },
        title: 'Profile',
        subtitle: 'Stable UI packages',
        actions: Button({ label: 'Save' }),
        children: [
          FormField({ label: 'Name', value: 'Ada Lovelace', helper: 'Shown on receipts' }),
          Listbox({
            id: 'visual-finish',
            label: 'Finish',
            value: 'cobalt',
            options: [
              { value: 'black', label: 'Black' },
              { value: 'cobalt', label: 'Cobalt' },
            ],
          }),
        ],
      }),
      footer: 'Keyboard and focus contracts',
    }),
  }), document.body);

  await expect.element(page.getByTestId('ui-visual')).toMatchScreenshot('stable-ui-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: {
      allowedMismatchedPixelRatio: 0.05,
      // Preserve geometric/color sensitivity while ignoring minor cross-OS font rasterization.
      threshold: 0.15,
    },
  });
  uiOwner.dispose();
});

test('matches Select default, disabled, invalid, and public size states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="select-visual"] { box-sizing: border-box; inline-size: 420px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="select-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .select-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .select-state-grid label { display: grid; gap: 6px; font-size: 13px; font-weight: 650; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);
  const options = [
    q.option({ value: 'black', children: 'Black' }),
    q.option({ value: 'cobalt', children: 'Cobalt' }),
  ];

  render(q.main({
    data: { testid: 'select-visual' },
    children: [
      q.h1({ children: 'Native Select states' }),
      q.div({
        class: 'select-state-grid',
        children: [
          q.label({ children: ['Default', Select({ value: 'black', children: options })] }),
          q.label({ children: ['Disabled', Select({ value: 'cobalt', disabled: true, children: options })] }),
          q.label({ children: ['Invalid', Select({ value: 'black', invalid: true, children: options })] }),
          q.label({ children: ['Small', Select({ value: 'cobalt', size: 'small', children: options })] }),
          q.label({ children: ['Large', Select({ value: 'black', size: 'large', fullWidth: true, children: options })] }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('select-visual')).toMatchScreenshot('select-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.03, threshold: 0.15 },
  });
  uiOwner.dispose();
});
