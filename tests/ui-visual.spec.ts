import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import {
  Button,
  atomStyles,
  installUiTheme,
} from '@gluonjs/atoms';
import {
  adoptStyles,
  css,
  foundationStyles,
  layerOrderStyles,
  render,
} from '../src/index.js';
import { Card, FormField, moleculeStyles } from '@gluonjs/molecules';
import { AppShell, organismStyles } from '@gluonjs/organisms';
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
  adoptStyles(document, layerOrderStyles, foundationStyles, atomStyles, moleculeStyles, organismStyles, visualStyles);
  installUiTheme(document, 'light');

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
});
