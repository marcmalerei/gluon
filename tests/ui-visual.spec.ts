import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import {
  Button,
  Checkbox,
  Icon,
  Progress,
  Radio,
  Switch,
  ToggleButton,
  Select,
  StatusBadge,
  Textarea,
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

test('matches Textarea default, disabled, readonly, invalid, and width states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="textarea-visual"] { box-sizing: border-box; inline-size: 520px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="textarea-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .textarea-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .textarea-state-grid label { display: grid; gap: 6px; font-size: 13px; font-weight: 650; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'textarea-visual' },
    children: [
      q.h1({ children: 'Native Textarea states' }),
      q.div({
        class: 'textarea-state-grid',
        children: [
          q.label({ children: ['Default', Textarea({ value: 'Workshop entrance', rows: 3 })] }),
          q.label({ children: ['Disabled', Textarea({ value: 'Unavailable note', disabled: true, rows: 3 })] }),
          q.label({ children: ['Readonly', Textarea({ value: 'Recorded instruction', readOnly: true, rows: 3 })] }),
          q.label({ children: ['Invalid', Textarea({ value: 'Check this note', invalid: true, rows: 3 })] }),
          q.label({ children: ['Full width', Textarea({ value: 'Across the complete field', fullWidth: true, rows: 3 })] }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('textarea-visual')).toMatchScreenshot('textarea-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.03, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches Checkbox unchecked, checked, indeterminate, disabled, and invalid states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="checkbox-visual"] { box-sizing: border-box; inline-size: 420px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="checkbox-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .checkbox-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
      .checkbox-state-grid label { display: flex; min-block-size: 44px; align-items: center; gap: 10px; font-size: 13px; font-weight: 650; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'checkbox-visual' },
    children: [
      q.h1({ children: 'Native Checkbox states' }),
      q.div({
        class: 'checkbox-state-grid',
        children: [
          q.label({ children: [Checkbox({}), 'Unchecked'] }),
          q.label({ children: [Checkbox({ checked: true }), 'Checked'] }),
          q.label({ children: [Checkbox({ indeterminate: true }), 'Indeterminate'] }),
          q.label({ children: [Checkbox({ checked: true, disabled: true }), 'Disabled'] }),
          q.label({ children: [Checkbox({ invalid: true }), 'Invalid'] }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('checkbox-visual')).toMatchScreenshot('checkbox-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: {
      // Native checkbox and font rasterization differ slightly between macOS and Linux WebKit.
      allowedMismatchedPixelRatio: 0.04,
      threshold: 0.15,
    },
  });
  uiOwner.dispose();
});

test('matches Radio unchecked, checked, disabled, and invalid states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="radio-visual"] { box-sizing: border-box; inline-size: 420px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="radio-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .radio-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
      .radio-state-grid label { display: flex; min-block-size: 44px; align-items: center; gap: 10px; font-size: 13px; font-weight: 650; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'radio-visual' },
    children: [
      q.h1({ children: 'Native Radio states' }),
      q.div({
        class: 'radio-state-grid',
        children: [
          q.label({ children: [Radio({ name: 'state' }), 'Unchecked'] }),
          q.label({ children: [Radio({ name: 'state', checked: true }), 'Checked'] }),
          q.label({ children: [Radio({ disabled: true }), 'Disabled'] }),
          q.label({ children: [Radio({ invalid: true }), 'Invalid'] }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('radio-visual')).toMatchScreenshot('radio-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.03, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches Switch off, on, disabled, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="switch-visual"] { box-sizing: border-box; inline-size: 420px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="switch-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .switch-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
      .switch-state-grid label { display: flex; min-block-size: 44px; align-items: center; gap: 10px; font-size: 13px; font-weight: 650; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'switch-visual' },
    children: [
      q.h1({ children: 'Native Switch states' }),
      q.div({
        class: 'switch-state-grid',
        children: [
          q.label({ children: [Switch({}), 'Off'] }),
          q.label({ children: [Switch({ checked: true }), 'On'] }),
          q.label({ children: [Switch({ checked: true, disabled: true }), 'Disabled'] }),
          q.label({ dir: 'rtl', children: [Switch({ checked: true }), 'RTL'] }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('switch-visual')).toMatchScreenshot('switch-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.06, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches ToggleButton pressed, unpressed, icon, disabled, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="toggle-button-visual"] { box-sizing: border-box; inline-size: 380px; block-size: 220px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="toggle-button-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .toggle-button-state-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'toggle-button-visual' },
    children: [
      q.h1({ children: 'ToggleButton states' }),
      q.div({
        class: 'toggle-button-state-grid',
        children: [
          ToggleButton({ pressed: false, label: 'List view', variant: 'ghost' }),
          ToggleButton({ pressed: true, label: 'Grid view', variant: 'ghost' }),
          ToggleButton({ pressed: true, children: [Icon({ name: 'spark' }), ' Featured'], variant: 'secondary' }),
          ToggleButton({ pressed: false, label: 'Disabled', disabled: true }),
          q.div({ dir: 'rtl', children: ToggleButton({ pressed: true, label: 'RTL', variant: 'ghost' }) }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('toggle-button-visual')).toMatchScreenshot('toggle-button-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.04, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches Progress determinate, indeterminate, full-width, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="progress-visual"] { box-sizing: border-box; inline-size: 380px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="progress-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .progress-state-grid { display: grid; gap: 18px; }
      .progress-state-grid label { display: grid; gap: 8px; font-size: 13px; font-weight: 650; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'progress-visual' },
    children: [
      q.h1({ children: 'Native Progress states' }),
      q.div({
        class: 'progress-state-grid',
        children: [
          q.label({ children: ['Determinate 35%', Progress({ value: 35, attributes: { 'aria-label': 'Determinate progress' } })] }),
          q.label({ children: ['Indeterminate', Progress({ attributes: { 'aria-label': 'Indeterminate progress' } })] }),
          q.label({ children: ['Full width', Progress({ value: 68, fullWidth: true, attributes: { 'aria-label': 'Full-width progress' } })] }),
          q.label({ dir: 'rtl', children: ['RTL 50%', Progress({ value: 50, attributes: { 'aria-label': 'RTL progress' } })] }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('progress-visual')).toMatchScreenshot('progress-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.04, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches StatusBadge tones, wrapping, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="status-badge-visual"] { box-sizing: border-box; inline-size: 380px; block-size: 280px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="status-badge-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .status-badge-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 12px; }
      .status-badge-wrap { inline-size: 9rem; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'status-badge-visual' },
    children: [
      q.h1({ children: 'StatusBadge tones' }),
      q.div({
        class: 'status-badge-grid',
        children: [
          StatusBadge({ children: 'Neutral' }),
          StatusBadge({ tone: 'info', children: 'Information' }),
          StatusBadge({ tone: 'success', children: 'In stock' }),
          StatusBadge({ tone: 'warning', children: 'Low stock' }),
          StatusBadge({ tone: 'danger', children: 'Unavailable' }),
          q.div({ class: 'status-badge-wrap', children: StatusBadge({ tone: 'warning', children: 'Waiting for workshop confirmation' }) }),
          q.div({ dir: 'rtl', children: StatusBadge({ tone: 'info', children: 'RTL status' }) }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('status-badge-visual')).toMatchScreenshot('status-badge-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.04, threshold: 0.15 },
  });
  uiOwner.dispose();
});
