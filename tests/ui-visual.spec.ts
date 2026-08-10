import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import {
  Button,
  Checkbox,
  Icon,
  Input,
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
  unadoptStyles,
} from '../src/index.js';
import { ButtonGroup, Card, ChoiceGroup, ControlField, DialogSurface, FormField, SegmentedControl, Tabs, createDialogSurfaceController } from '@gluonjs/molecules';
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
    comparatorOptions: { allowedMismatchedPixelRatio: 0.04, threshold: 0.15 },
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
    comparatorOptions: { allowedMismatchedPixelRatio: 0.06, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches ControlField helper, required, error, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="control-field-visual"] { box-sizing: border-box; inline-size: 420px; block-size: 560px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="control-field-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .control-field-grid { display: grid; gap: 18px; }
      .control-field-grid :is(input, select, textarea) { box-sizing: border-box; inline-size: 100%; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'control-field-visual' },
    children: [
      q.h1({ children: 'ControlField states' }),
      q.div({
        class: 'control-field-grid',
        children: [
          ControlField({ id: 'visual-name', label: 'Full name', helper: 'Shown on receipts', required: true, control: (relationships) => Input({ value: 'Ada Lovelace', attributes: { id: relationships.controlId, required: relationships.required, aria: relationships.aria } }) }),
          ControlField({ id: 'visual-window', label: 'Delivery window', control: (relationships) => Select({ value: 'morning', attributes: { id: relationships.controlId, aria: relationships.aria }, children: [q.option({ value: 'morning', children: 'Morning' }), q.option({ value: 'afternoon', children: 'Afternoon' })] }) }),
          ControlField({ id: 'visual-note', label: 'Courier note', error: 'Add a delivery note', control: (relationships) => Textarea({ value: '', rows: 2, invalid: relationships.invalid, attributes: { id: relationships.controlId, aria: relationships.aria } }) }),
          q.div({ dir: 'rtl', children: ControlField({ id: 'visual-rtl', label: 'RTL field', helper: 'Logical alignment', control: (relationships) => Input({ value: 'RTL', attributes: { id: relationships.controlId, aria: relationships.aria } }) }) }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('control-field-visual')).toMatchScreenshot('control-field-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.04, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches ChoiceGroup Radio, Checkbox, layout, error, disabled, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="choice-group-visual"] { box-sizing: border-box; inline-size: 420px; block-size: 440px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="choice-group-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .choice-group-grid { display: grid; gap: 22px; }
      .gluon-choice-group-options label { display: inline-flex; min-block-size: 44px; align-items: center; gap: 8px; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);

  render(q.main({
    data: { testid: 'choice-group-visual' },
    children: [
      q.h1({ children: 'ChoiceGroup states' }),
      q.div({
        class: 'choice-group-grid',
        children: [
          ChoiceGroup({ id: 'visual-finish', legend: 'Finish', helper: 'Choose one', orientation: 'horizontal', children: [q.label({ children: [Radio({ name: 'visual-finish', checked: true }), ' Graphite'] }), q.label({ children: [Radio({ name: 'visual-finish' }), ' Cobalt'] })] }),
          ChoiceGroup({ id: 'visual-features', legend: 'Features', error: 'Choose at least one feature', children: [q.label({ children: [Checkbox({ checked: true }), ' Repairable'] }), q.label({ children: [Checkbox({}), ' Recycled'] })] }),
          q.div({ dir: 'rtl', children: ChoiceGroup({ id: 'visual-disabled', legend: 'Disabled RTL', disabled: true, orientation: 'horizontal', children: [q.label({ children: [Radio({ checked: true }), ' One'] }), q.label({ children: [Radio({}), ' Two'] })] }) }),
        ],
      }),
    ],
  }), document.body);

  await expect.element(page.getByTestId('choice-group-visual')).toMatchScreenshot('choice-group-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.05, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches ButtonGroup spaced, attached, vertical, wrapped, and RTL layouts', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="button-group-visual"] { box-sizing: border-box; inline-size: 420px; block-size: 390px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="button-group-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .button-group-grid { display: grid; gap: 22px; }
      .narrow-actions { inline-size: 220px; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);
  render(q.main({ data: { testid: 'button-group-visual' }, children: [
    q.h1({ children: 'ButtonGroup states' }),
    q.div({ class: 'button-group-grid', children: [
      ButtonGroup({ label: 'Spaced actions', children: [Button({ label: 'Save' }), Button({ label: 'Preview', variant: 'secondary' })] }),
      ButtonGroup({ label: 'Attached actions', presentation: 'attached', children: [Button({ label: 'Day', variant: 'secondary' }), Button({ label: 'Week', variant: 'secondary' }), Button({ label: 'Month', variant: 'secondary' })] }),
      ButtonGroup({ label: 'Wrapped actions', attributes: { class: 'narrow-actions' }, children: [Button({ label: 'Export' }), Button({ label: 'Duplicate', variant: 'secondary' }), Button({ label: 'Archive', variant: 'secondary' })] }),
      q.div({ dir: 'rtl', children: ButtonGroup({ label: 'RTL vertical actions', orientation: 'vertical', presentation: 'attached', children: [Button({ label: 'Top', variant: 'secondary' }), Button({ label: 'Bottom', variant: 'secondary' })] }) }),
    ] }),
  ] }), document.body);
  await expect.element(page.getByTestId('button-group-visual')).toMatchScreenshot('button-group-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.05, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches SegmentedControl selected, disabled, vertical, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="segmented-control-visual"] { box-sizing: border-box; inline-size: 420px; block-size: 340px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="segmented-control-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .segmented-grid { display: grid; gap: 24px; }
      .wide-segments { inline-size: 100%; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);
  render(q.main({ data: { testid: 'segmented-control-visual' }, children: [
    q.h1({ children: 'SegmentedControl states' }),
    q.div({ class: 'segmented-grid', children: [
      SegmentedControl({ label: 'View', value: 'grid', attributes: { class: 'wide-segments' }, options: [{ value: 'grid', label: 'Grid' }, { value: 'map', label: 'Map', disabled: true }, { value: 'list', label: 'List' }] }),
      SegmentedControl({ label: 'Density', value: 'compact', orientation: 'vertical', options: [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }] }),
      q.div({ dir: 'rtl', children: SegmentedControl({ label: 'RTL range', value: 'month', options: [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }] }) }),
    ] }),
  ] }), document.body);
  await expect.element(page.getByTestId('segmented-control-visual')).toMatchScreenshot('segmented-control-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.05, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches Tabs selected, disabled, overflow, panel, vertical, and RTL states', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer gluon {
      body { margin: 0; background: #fff; }
      [data-testid="tabs-visual"] { box-sizing: border-box; inline-size: 420px; block-size: 430px; padding: 24px; color: #17312f; font: 16px/1.4 system-ui, sans-serif; }
      [data-testid="tabs-visual"] h1 { margin: 0 0 20px; font-size: 22px; }
      .tabs-grid { display: grid; gap: 26px; }
      .overflow-tabs { inline-size: 280px; }
    }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);
  render(q.main({ data: { testid: 'tabs-visual' }, children: [
    q.h1({ children: 'Tabs states' }),
    q.div({ class: 'tabs-grid', children: [
      Tabs({ label: 'Product information', value: 'details', attributes: { class: 'overflow-tabs' }, items: [
        { id: 'visual-story', value: 'story', label: 'Story', panel: 'Story panel' },
        { id: 'visual-details', value: 'details', label: 'Details', panel: q.p({ children: 'Powder-coated steel and replaceable hardware.' }) },
        { id: 'visual-care', value: 'care', label: 'Care', panel: 'Care panel', disabled: true },
        { id: 'visual-delivery', value: 'delivery', label: 'Delivery', panel: 'Delivery panel' },
      ] }),
      q.div({ dir: 'rtl', children: Tabs({ label: 'Vertical RTL tabs', value: 'second', orientation: 'vertical', items: [
        { id: 'visual-first', value: 'first', label: 'First', panel: 'First panel' },
        { id: 'visual-second', value: 'second', label: 'Second', panel: 'Second panel' },
      ] }) }),
    ] }),
  ] }), document.body);
  await expect.element(page.getByTestId('tabs-visual')).toMatchScreenshot('tabs-states-light', {
    comparatorName: 'pixelmatch',
    comparatorOptions: { allowedMismatchedPixelRatio: 0.05, threshold: 0.15 },
  });
  uiOwner.dispose();
});

test('matches DialogSurface labelled header, description, content, close action, and footer', async () => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
  const visualStyles = css`
    @layer app { body { margin: 0; inline-size: 640px; block-size: 520px; } .dialog-copy { display: grid; gap: .75rem; } .dialog-actions { display: flex; justify-content: end; gap: .75rem; } button { min-block-size: 44px; padding-inline: 1rem; } }
  `;
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, visualStyles);
  render(DialogSurface({
    id: 'visual-dialog',
    labelledBy: 'visual-dialog-title',
    title: 'Archive project?',
    description: 'The project remains available in archived work.',
    controller: createDialogSurfaceController(),
    closeAction: q.button({ type: 'button', 'aria-label': 'Close dialog', children: '×' }),
    children: q.div({ class: 'dialog-copy', children: [
      q.p({ children: 'Open tasks and files are preserved.' }),
      q.label({ children: [q.input({ type: 'checkbox' }), ' Notify collaborators'] }),
    ] }),
    footer: q.div({ class: 'dialog-actions', children: [
      q.button({ type: 'button', children: 'Cancel' }),
      q.button({ type: 'button', children: 'Archive' }),
    ] }),
  }), document.body);
  await expect.element(page.getByRole('dialog')).toMatchScreenshot('dialog-surface-states-light', {
    comparatorName: 'pixelmatch', threshold: 0.1,
  });
  unadoptStyles(document, visualStyles);
  uiOwner.dispose();
});
