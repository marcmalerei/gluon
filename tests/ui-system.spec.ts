import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import axe, { type Result } from 'axe-core';
import {
  Button,
  AspectRatio,
  Avatar,
  Checkbox,
  Icon,
  Input,
  Progress,
  Slider,
  normalizeSliderRange,
  normalizeSliderValue,
  Radio,
  Select,
  StatusBadge,
  Switch,
  ToggleButton,
  defineToggleButtonPreset,
  Textarea,
  ScrollArea,
  Separator,
  atomManifest,
  atomStyles,
  createUiStyleSelection,
  getThemeStyles,
  installUi,
  installUiTheme,
  UiHydrationError,
  uiTokenStyles,
} from '@gluonjs/atoms';
import {
  adoptStyles,
  foundationStyles,
  getStyleSheetText,
  layerOrderStyles,
  render,
  html,
  unadoptStyles,
} from '../src/index.js';
import { createStyleManifest, renderStyleCarriers } from '@gluonjs/ssr';
import {
  Accordion,
  Card,
  ButtonGroup,
  ChoiceGroup,
  ControlField,
  DialogSurface,
  Disclosure,
  EmptyState,
  FormField,
  InlineNotice,
  NavigationStrip,
  SegmentedControl,
  TableRegion,
  Tabs,
  createDialogSurfaceController,
  moleculeManifest,
  moleculeStyles,
} from '@gluonjs/molecules';
import { AppShell, organismManifest, organismStyles } from '@gluonjs/organisms';
import {
  Dialog,
  type DialogProps,
  Field,
  Listbox,
  Overlay,
  Popover,
  createFocusScope,
  getFocusableElements,
  q,
  quarkManifest,
} from '@gluonjs/quarks';

beforeEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('separate UI package contracts', () => {
  it('keeps foundation atoms native, scoped, and independently style-addressable', () => {
    const host = document.createElement('div');
    document.body.append(host);
    render(html`${AspectRatio({ ratio: 1.5, children: 'content' })}${Avatar({ alt: 'Ada', fallback: 'A', status: 'error' })}${ScrollArea({ children: 'scroll content', attributes: { 'aria-label': 'Notes' } })}${Separator({})}`, host);
    expect(host.querySelector('.gluon-aspect-ratio')).not.toBeNull();
    expect(host.querySelector('.gluon-avatar__fallback')?.textContent).toBe('A');
    expect(host.querySelector('.gluon-scroll-area')?.getAttribute('role')).toBeNull();
    expect(host.querySelector('.gluon-scroll-area')?.getAttribute('tabindex')).toBe('0');
    expect(host.querySelector('.gluon-separator')?.getAttribute('role')).toBe('separator');
  });
  it('keeps Checkbox native checked, indeterminate, form-reset, and submission behavior', () => {
    const onChange = vi.fn();
    const form = document.createElement('form');
    document.body.append(form);
    render(Checkbox({
      checked: true,
      indeterminate: true,
      name: 'policy',
      value: 'accepted',
      required: true,
      invalid: true,
      onChange,
      attributes: { id: 'policy-consent' },
    }), form);

    const checkbox = form.querySelector<HTMLInputElement>('#policy-consent')!;
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(true);
    expect(checkbox.defaultChecked).toBe(true);
    expect(checkbox.indeterminate).toBe(true);
    expect(checkbox.required).toBe(true);
    expect(checkbox.getAttribute('aria-invalid')).toBe('true');
    expect(new FormData(form).get('policy')).toBe('accepted');
    checkbox.checked = false;
    checkbox.indeterminate = false;
    form.reset();
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('keeps Radio native grouping, Arrow-key, form, validation, and change behavior', async () => {
    const onChange = vi.fn();
    const form = document.createElement('form');
    document.body.append(form);
    render(q.div({ children: [
      q.label({ children: ['Graphite', Radio({ checked: true, name: 'finish', value: 'graphite', required: true, attributes: { id: 'finish-graphite' } })] }),
      q.label({ children: ['Cobalt', Radio({ name: 'finish', value: 'cobalt', invalid: true, onChange, attributes: { id: 'finish-cobalt' } })] }),
    ] }), form);

    const graphite = form.querySelector<HTMLInputElement>('#finish-graphite')!;
    const cobalt = form.querySelector<HTMLInputElement>('#finish-cobalt')!;
    expect(graphite.type).toBe('radio');
    expect(graphite.checked).toBe(true);
    expect(graphite.required).toBe(true);
    expect(cobalt.getAttribute('aria-invalid')).toBe('true');
    expect(new FormData(form).get('finish')).toBe('graphite');

    graphite.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(cobalt.checked).toBe(true);
    expect(graphite.checked).toBe(false);
    expect(new FormData(form).get('finish')).toBe('cobalt');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('keeps Switch native Space-key, form, label, and change behavior', async () => {
    const onChange = vi.fn();
    const form = document.createElement('form');
    document.body.append(form);
    render(q.label({ children: [
      Switch({ name: 'network', value: 'enabled', required: true, onChange, attributes: { id: 'network-switch' } }),
      'Allow network access',
    ] }), form);

    const control = form.querySelector<HTMLInputElement>('#network-switch')!;
    expect(control.type).toBe('checkbox');
    expect(control.getAttribute('role')).toBe('switch');
    expect(control.required).toBe(true);
    expect(new FormData(form).has('network')).toBe(false);

    control.focus();
    await userEvent.keyboard(' ');
    expect(control.checked).toBe(true);
    expect(new FormData(form).get('network')).toBe('enabled');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('keeps ToggleButton controlled aria-pressed, preset, activation, and disabled behavior', () => {
    const onClick = vi.fn();
    const FilterToggle = defineToggleButtonPreset({
      displayName: 'FilterToggle',
      variant: 'ghost',
      size: 'small',
      class: 'filter-toggle',
    });
    render(q.div({ children: [
      ToggleButton({ pressed: true, label: 'Grid view', onClick, attributes: { id: 'grid-toggle' } }),
      FilterToggle({ pressed: false, label: 'Available only', attributes: { id: 'filter-toggle' } }),
      ToggleButton({ pressed: false, label: 'Disabled view', disabled: true, attributes: { id: 'disabled-toggle' } }),
    ] }), document.body);

    const grid = document.querySelector<HTMLButtonElement>('#grid-toggle')!;
    const filter = document.querySelector<HTMLButtonElement>('#filter-toggle')!;
    const disabled = document.querySelector<HTMLButtonElement>('#disabled-toggle')!;
    expect(grid.type).toBe('button');
    expect(grid.getAttribute('aria-pressed')).toBe('true');
    grid.click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(grid.getAttribute('aria-pressed')).toBe('true');
    expect(filter.classList).toContain('filter-toggle');
    expect(filter.classList).toContain('is-ghost');
    expect(filter.classList).toContain('is-small');
    expect(disabled.disabled).toBe(true);
  });

  it('keeps Progress native determinate and indeterminate semantics', () => {
    render(q.div({ children: [
      Progress({ value: 35, max: 80, attributes: { id: 'upload-progress', 'aria-label': 'Upload progress' } }),
      Progress({ fullWidth: true, attributes: { id: 'inventory-progress', 'aria-label': 'Inventory check' } }),
    ] }), document.body);

    const determinate = document.querySelector<HTMLProgressElement>('#upload-progress')!;
    const indeterminate = document.querySelector<HTMLProgressElement>('#inventory-progress')!;
    expect(determinate.value).toBe(35);
    expect(determinate.max).toBe(80);
    expect(determinate.getAttribute('value')).toBe('35');
    expect(indeterminate.hasAttribute('value')).toBe(false);
    expect(indeterminate.classList).toContain('is-full-width');
    expect(indeterminate.getAttribute('aria-label')).toBe('Inventory check');
  });

  it('normalizes Slider bounds and decimal values deterministically', () => {
    expect(normalizeSliderRange(Number.NaN, Number.POSITIVE_INFINITY, 0)).toEqual({ min: 0, max: 100, step: 1 });
    expect(normalizeSliderRange(8, 2, -1)).toEqual({ min: 8, max: 8, step: 1 });
    const decimal = normalizeSliderRange(0.1, 1, 0.1);
    expect(normalizeSliderValue(0.30000000000000004, decimal)).toBe(0.3);
    expect(normalizeSliderValue(-10, decimal)).toBe(0.1);
    expect(normalizeSliderValue(10, decimal)).toBe(1);
    expect(normalizeSliderValue(Number.NaN, decimal, 0.5)).toBe(0.5);
    expect(normalizeSliderValue(Number.NaN, decimal, Number.POSITIVE_INFINITY)).toBe(0.1);
    expect(normalizeSliderValue(1, normalizeSliderRange(0, 1, 0.3))).toBe(0.9);
    expect(normalizeSliderValue(9, normalizeSliderRange(5, 2, 1))).toBe(5);
    expect(normalizeSliderValue(0.0000003, normalizeSliderRange(0, 0.000001, 0.0000001))).toBe(0.0000003);
    const large = normalizeSliderValue(10_000_000_000_000_055, normalizeSliderRange(10_000_000_000_000_000, 10_000_000_000_000_100, 10));
    expect(Number.isFinite(large)).toBe(true);
    expect(large).toBeGreaterThanOrEqual(10_000_000_000_000_000);
    expect(large).toBeLessThanOrEqual(10_000_000_000_000_100);
    expect(normalizeSliderValue(0, normalizeSliderRange(-1e308, 1e308, Number.MIN_VALUE))).toBe(-1e308);
    render(q.div({ children: [
      Slider({ value: Number.NaN, min: Number.NaN, max: Number.POSITIVE_INFINITY, step: 0, attributes: { id: 'normalized-invalid', 'aria-label': 'Normalized invalid' } }),
      Slider({ value: 20, min: 8, max: 2, step: -1, attributes: { id: 'normalized-collapsed', 'aria-label': 'Normalized collapsed' } }),
    ] }), document.body);
    const invalid = document.querySelector<HTMLInputElement>('#normalized-invalid')!;
    const collapsed = document.querySelector<HTMLInputElement>('#normalized-collapsed')!;
    expect({ min: invalid.min, max: invalid.max, step: invalid.step, value: invalid.value }).toEqual({ min: '0', max: '100', step: '1', value: '50' });
    expect({ min: collapsed.min, max: collapsed.max, step: collapsed.step, value: collapsed.value }).toEqual({ min: '8', max: '8', step: '1', value: '8' });
  });

  it('keeps Slider native range, form, accessible-name, orientation, and event semantics', async () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    const form = document.createElement('form');
    document.body.append(form);
    render(q.label({ id: 'volume-label', children: ['Volume', Slider({ defaultValue: 25, min: 0, max: 100, step: 5, valueText: '25 percent', onInput, onChange, attributes: { id: 'volume', name: 'volume' } })] }), form);
    const slider = form.querySelector<HTMLInputElement>('#volume')!;
    expect(slider.type).toBe('range');
    expect(slider.value).toBe('25');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('100');
    expect(slider.step).toBe('5');
    expect(slider.getAttribute('aria-valuetext')).toBe('25 percent');
    expect(slider.labels?.[0]?.id).toBe('volume-label');
    expect(new FormData(form).get('volume')).toBe('25');
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(slider.value).toBe('30');
    expect(new FormData(form).get('volume')).toBe('30');
    expect(onInput).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('preserves uncontrolled state and restores controlled state on rerender without duplicate events', async () => {
    const input = vi.fn();
    const change = vi.fn();
    const uncontrolled = () => Slider({ defaultValue: 2, min: 0, max: 4, onInput: input, onChange: change, attributes: { id: 'uncontrolled', 'aria-label': 'Uncontrolled' } });
    render(uncontrolled(), document.body);
    const slider = document.querySelector<HTMLInputElement>('#uncontrolled')!;
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(slider.value).toBe('3');
    render(uncontrolled(), document.body);
    expect(slider.value).toBe('3');
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();

    const controlled = (value: number) => Slider({ value, min: 0, max: 4, onInput: input, onChange: change, attributes: { id: 'controlled', 'aria-label': 'Controlled' } });
    render(controlled(2), document.body);
    const controlledSlider = document.querySelector<HTMLInputElement>('#controlled')!;
    controlledSlider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(controlledSlider.value).toBe('3');
    controlledSlider.blur();
    render(controlled(2), document.body);
    expect(controlledSlider.value).toBe('2');
    render(controlled(4), document.body);
    expect(controlledSlider.value).toBe('4');
    expect(input).toHaveBeenCalledTimes(2);
    expect(change.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(change.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('updates a pristine uncontrolled default and preserves a dirty current value across later defaults', async () => {
    const view = (defaultValue: number) => Slider({ defaultValue, min: 0, max: 5, attributes: { id: 'default-sync', name: 'level', 'aria-label': 'Default sync' } });
    const form = document.createElement('form');
    document.body.append(form);
    render(view(1), form);
    const slider = form.querySelector<HTMLInputElement>('#default-sync')!;
    render(view(2), form);
    expect(slider.value).toBe('2');
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(slider.value).toBe('3');
    render(view(4), form);
    expect(slider.value).toBe('3');
    form.reset();
    expect(slider.value).toBe('4');
  });

  it('freezes the last uncontrolled value when readonly is enabled on rerender', async () => {
    const input = vi.fn();
    const change = vi.fn();
    const view = (readonly: boolean) => Slider({ defaultValue: 1, min: 0, max: 4, readonly, onInput: input, onChange: change, attributes: { id: 'readonly-transition', 'aria-label': 'Readonly transition' } });
    render(view(false), document.body);
    const slider = document.querySelector<HTMLInputElement>('#readonly-transition')!;
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(slider.value).toBe('2');
    render(view(true), document.body);
    await userEvent.keyboard('{ArrowRight}');
    expect(slider.value).toBe('2');
    slider.value = '4';
    slider.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    expect(slider.value).toBe('2');
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
  });

  it('rejects readonly keyboard, pointer, input, and change interactions for controlled and uncontrolled sliders', async () => {
    const input = vi.fn();
    const change = vi.fn();
    const renderReadonly = () => q.div({ children: [
      Slider({ value: 2, min: 0, max: 4, readonly: true, onInput: input, onChange: change, attributes: { id: 'readonly-controlled', 'aria-label': 'Readonly controlled' } }),
      Slider({ defaultValue: 3, min: 0, max: 4, readonly: true, onInput: input, onChange: change, attributes: { id: 'readonly-uncontrolled', 'aria-label': 'Readonly uncontrolled' } }),
      Slider({ defaultValue: 1, min: 0, max: 4, disabled: true, onInput: input, onChange: change, attributes: { id: 'disabled-slider', 'aria-label': 'Disabled' } }),
    ] });
    render(renderReadonly(), document.body);
    const controlled = document.querySelector<HTMLInputElement>('#readonly-controlled')!;
    const uncontrolled = document.querySelector<HTMLInputElement>('#readonly-uncontrolled')!;
    controlled.focus();
    await userEvent.keyboard('{ArrowRight}{End}{Home}{PageUp}{PageDown}');
    await userEvent.click(controlled);
    expect(controlled.value).toBe('2');
    uncontrolled.value = '4';
    uncontrolled.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    uncontrolled.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    expect(uncontrolled.value).toBe('3');
    render(renderReadonly(), document.body);
    expect(uncontrolled.value).toBe('3');
    expect(controlled.getAttribute('aria-readonly')).toBe('true');
    const disabled = document.querySelector<HTMLInputElement>('#disabled-slider')!;
    expect(disabled.disabled).toBe(true);
    disabled.click();
    expect(input).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('supports exact pointer events and horizontal/vertical LTR/RTL contracts', async () => {
    const input = vi.fn();
    const change = vi.fn();
    const functionRef = vi.fn();
    const objectRef: { value?: HTMLInputElement } = {};
    render(q.div({ children: [
      Slider({ defaultValue: 0, min: 0, max: 100, onInput: input, onChange: change, attributes: { id: 'pointer-slider', 'aria-label': 'Pointer', ref: functionRef } }),
      q.div({ dir: 'rtl', children: Slider({ defaultValue: 5, orientation: 'horizontal', attributes: { id: 'horizontal-rtl', 'aria-label': 'Horizontal RTL', ref: objectRef } }) }),
      q.div({ dir: 'ltr', children: Slider({ defaultValue: 5, orientation: 'vertical', attributes: { id: 'vertical-ltr', 'aria-label': 'Vertical LTR' } }) }),
      q.div({ dir: 'rtl', children: Slider({ defaultValue: 5, orientation: 'vertical', attributes: { id: 'vertical-rtl', 'aria-label': 'Vertical RTL' } }) }),
    ] }), document.body);
    await userEvent.click(document.querySelector<HTMLInputElement>('#pointer-slider')!);
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(functionRef).toHaveBeenCalledWith(document.querySelector('#pointer-slider'));
    expect(objectRef.value).toBe(document.querySelector('#horizontal-rtl'));
    expect(getComputedStyle(document.querySelector('#pointer-slider')!).direction).toBe('ltr');
    expect(getComputedStyle(document.querySelector('#horizontal-rtl')!).direction).toBe('rtl');
    expect(document.querySelector('#vertical-ltr')?.classList).toContain('is-vertical');
    expect(document.querySelector('#vertical-ltr')?.parentElement?.dir).toBe('ltr');
    expect(document.querySelector('#vertical-rtl')?.parentElement?.dir).toBe('rtl');
    expect(document.querySelector('#vertical-ltr')?.getAttribute('aria-orientation')).toBe('vertical');
    expect(document.querySelector('#vertical-rtl')?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('keeps StatusBadge presentational while forwarding span attributes and tones', () => {
    render(q.div({ children: [
      StatusBadge({ children: 'Queued', attributes: { id: 'neutral-status', title: 'Order state' } }),
      StatusBadge({ tone: 'success', children: 'In stock', attributes: { id: 'success-status', dir: 'rtl' } }),
    ] }), document.body);

    const neutral = document.querySelector<HTMLSpanElement>('#neutral-status')!;
    const success = document.querySelector<HTMLSpanElement>('#success-status')!;
    expect(neutral.tagName).toBe('SPAN');
    expect(neutral.getAttribute('role')).toBeNull();
    expect(neutral.title).toBe('Order state');
    expect(neutral.classList).toContain('is-neutral');
    expect(success.classList).toContain('is-success');
    expect(success.dir).toBe('rtl');
    expect(success.textContent).toBe('In stock');
  });

  it('wires ControlField labels, help, errors, and caller-owned controls without cloning state', () => {
    const field = (
      id: string,
      control: Parameters<typeof ControlField>[0]['control'],
      options: { helper?: string; error?: string; required?: boolean } = {},
    ) => ControlField({ id, label: id, control, ...options });
    render(q.div({ children: [
      field('input-control', (relationships) => Input({ value: 'Ada', invalid: relationships.invalid, attributes: { id: relationships.controlId, required: relationships.required, aria: relationships.aria } }), { helper: 'Receipt name', required: true }),
      field('select-control', (relationships) => Select({ value: 'one', attributes: { id: relationships.controlId, aria: relationships.aria }, children: q.option({ value: 'one', children: 'One' }) })),
      field('textarea-control', (relationships) => Textarea({ value: '', invalid: relationships.invalid, attributes: { id: relationships.controlId, aria: relationships.aria } }), { helper: 'Courier note', error: 'Enter a note' }),
      field('checkbox-control', (relationships) => Checkbox({ attributes: { id: relationships.controlId, aria: relationships.aria } })),
      field('radio-control', (relationships) => Radio({ name: 'control-choice', attributes: { id: relationships.controlId, aria: relationships.aria } })),
      field('switch-control', (relationships) => Switch({ attributes: { id: relationships.controlId, aria: relationships.aria } })),
    ] }), document.body);

    const input = document.querySelector<HTMLInputElement>('#input-control')!;
    const textarea = document.querySelector<HTMLTextAreaElement>('#textarea-control')!;
    expect(input.value).toBe('Ada');
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-labelledby')).toBe('input-control-label');
    expect(input.getAttribute('aria-describedby')).toBe('input-control-helper');
    expect(document.querySelector('label[for="input-control"]')?.textContent).toContain('input-control');
    expect(textarea.getAttribute('aria-describedby')).toBe('textarea-control-helper');
    expect(textarea.getAttribute('aria-errormessage')).toBe('textarea-control-error');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('#textarea-control-error')?.getAttribute('role')).toBe('alert');
    expect(document.querySelectorAll('.gluon-control-field')).toHaveLength(6);
  });

  it('keeps ChoiceGroup native fieldset, legend, disabled, form, and option behavior', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    render(q.div({ children: [
      ChoiceGroup({
        id: 'finish-group',
        legend: 'Finish',
        helper: 'Choose one finish',
        orientation: 'horizontal',
        children: [
          q.label({ children: [Radio({ name: 'finish-group-value', value: 'graphite', checked: true }), ' Graphite'] }),
          q.label({ children: [Radio({ name: 'finish-group-value', value: 'cobalt' }), ' Cobalt'] }),
        ],
      }),
      ChoiceGroup({
        id: 'feature-group',
        legend: 'Features',
        error: 'Choose a feature',
        disabled: true,
        children: q.label({ children: [Checkbox({ name: 'feature', value: 'repairable' }), ' Repairable'] }),
      }),
    ] }), form);

    const finish = form.querySelector<HTMLFieldSetElement>('#finish-group')!;
    const features = form.querySelector<HTMLFieldSetElement>('#feature-group')!;
    const radios = finish.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(finish.querySelector('legend')?.textContent).toBe('Finish');
    expect(finish.getAttribute('aria-describedby')).toBe('finish-group-helper');
    expect(finish.classList).toContain('is-horizontal');
    radios[1]!.click();
    expect(radios[1]!.checked).toBe(true);
    expect(new FormData(form).get('finish-group-value')).toBe('cobalt');
    expect(features.disabled).toBe(true);
    expect(features.getAttribute('aria-errormessage')).toBe('feature-group-error');
    expect(features.getAttribute('aria-invalid')).toBe('true');
    expect(features.querySelector<HTMLInputElement>('input')?.matches(':disabled')).toBe(true);
  });

  it('groups caller-owned buttons without changing their semantics or source order', async () => {
    render(q.div({ children: [
      q.h2({ id: 'actions-label', children: 'Document actions' }),
      ButtonGroup({
        labelledBy: 'actions-label',
        presentation: 'attached',
        wrap: false,
        children: [Button({ label: 'Save' }), ToggleButton({ label: 'Pin', pressed: false }), Button({ label: 'Share' })],
      }),
      ButtonGroup({ label: 'Vertical actions', orientation: 'vertical', children: [Button({ label: 'Up' }), Button({ label: 'Down' })] }),
    ] }), document.body);

    const groups = document.querySelectorAll<HTMLElement>('[role="group"]');
    expect(groups[0]?.getAttribute('aria-labelledby')).toBe('actions-label');
    expect(groups[0]?.dataset.orientation).toBe('horizontal');
    expect(groups[0]?.dataset.presentation).toBe('attached');
    expect(groups[0]?.classList).not.toContain('can-wrap');
    expect([...groups[0]!.querySelectorAll('button')].map((button) => button.textContent)).toEqual(['Save', 'Pin', 'Share']);
    expect(groups[0]?.querySelector('[role="tab"], [role="menuitem"]')).toBeNull();
    expect(groups[0]?.querySelector('[aria-pressed]')?.textContent).toBe('Pin');
    expect(groups[1]?.getAttribute('aria-label')).toBe('Vertical actions');
    expect(groups[1]?.classList).toContain('is-vertical');
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('Save');
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('Pin');
  });

  it('keeps SegmentedControl controlled and navigates one pressed-button Tab stop', async () => {
    const onChange = vi.fn();
    render(q.div({ children: [
      q.h2({ id: 'view-label', children: 'Result view' }),
      SegmentedControl({
        labelledBy: 'view-label',
        value: 'grid',
        options: [
          { value: 'grid', label: 'Grid' },
          { value: 'map', label: 'Map', disabled: true },
          { value: 'list', label: 'List' },
        ],
        onChange,
      }),
    ] }), document.body);
    const toolbar = document.querySelector<HTMLElement>('[role="toolbar"]')!;
    const buttons = [...toolbar.querySelectorAll<HTMLButtonElement>('button')];
    expect(toolbar.getAttribute('aria-labelledby')).toBe('view-label');
    expect(toolbar.getAttribute('aria-orientation')).toBe('horizontal');
    expect(toolbar.querySelector('[role="tab"], [role="radio"]')).toBeNull();
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);
    buttons[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[2]);
    expect(onChange).toHaveBeenLastCalledWith('list', expect.any(KeyboardEvent));
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');
    buttons[2]!.click();
    expect(onChange).toHaveBeenLastCalledWith('list', expect.any(MouseEvent));
  });

  it('supports vertical and RTL SegmentedControl arrow direction', async () => {
    const onChange = vi.fn();
    render(q.div({ dir: 'rtl', children: SegmentedControl({
      label: 'Density',
      value: 'comfortable',
      orientation: 'horizontal',
      options: [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }],
      onChange,
    }) }), document.body);
    const buttons = document.querySelectorAll<HTMLButtonElement>('.gluon-segmented-control-option');
    buttons[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[1]);
    expect(onChange).toHaveBeenLastCalledWith('compact', expect.any(KeyboardEvent));
  });

  it('supports vertical SegmentedControl Home, End, and disabled fallback behavior', async () => {
    const onChange = vi.fn();
    render(SegmentedControl({
      label: 'Priority',
      value: 'missing',
      orientation: 'vertical',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
      onChange,
    }), document.body);
    const buttons = document.querySelectorAll<HTMLButtonElement>('.gluon-segmented-control-option');
    expect([...buttons].map((button) => button.tabIndex)).toEqual([0, -1, -1]);
    buttons[1]!.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(buttons[0]);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(buttons[2]);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(buttons[0]);
    expect(onChange).toHaveBeenLastCalledWith('low', expect.any(KeyboardEvent));

    render(SegmentedControl({
      label: 'Disabled priority',
      value: 'low',
      disabled: true,
      options: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }],
    }), document.body);
    expect([...document.querySelectorAll<HTMLButtonElement>('.gluon-segmented-control-option')]
      .every((button) => button.disabled && button.tabIndex === -1)).toBe(true);
  });

  it('links controlled Tabs and panels with automatic roving focus', async () => {
    const onChange = vi.fn();
    const items = [
      { id: 'product-story', value: 'story', label: 'Story', panel: 'Adaptable product story' },
      { id: 'product-care', value: 'care', label: 'Care', panel: 'Care guidance', disabled: true },
      { id: 'product-details', value: 'details', label: 'Details', panel: 'Material details' },
    ];
    const view = (value: string) => Tabs({ label: 'Product information', value, items, onChange });
    render(view('story'), document.body);
    const list = document.querySelector<HTMLElement>('[role="tablist"]')!;
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(list.getAttribute('aria-label')).toBe('Product information');
    expect(list.getAttribute('aria-orientation')).toBe('horizontal');
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs[0]?.getAttribute('aria-controls')).toBe('product-story-panel');
    expect(document.querySelector('#product-story-panel')?.getAttribute('aria-labelledby')).toBe('product-story-tab');
    expect(document.querySelector<HTMLElement>('#product-story-panel')?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#product-details-panel')?.hidden).toBe(true);
    tabs[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tabs[2]);
    expect(onChange).toHaveBeenLastCalledWith('details', expect.any(KeyboardEvent));
    render(view('details'), document.body);
    const selected = document.querySelector<HTMLButtonElement>('#product-details-tab')!;
    expect(document.activeElement).toBe(selected);
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector<HTMLElement>('#product-details-panel')?.hidden).toBe(false);
  });

  it('keeps manual vertical Tabs focused until Enter and reverses horizontal RTL arrows', async () => {
    const onChange = vi.fn();
    render(q.div({ dir: 'rtl', children: Tabs({
      label: 'Account sections',
      value: 'profile',
      activation: 'manual',
      items: [
        { id: 'account-profile', value: 'profile', label: 'Profile', panel: 'Profile panel' },
        { id: 'account-security', value: 'security', label: 'Security', panel: 'Security panel' },
      ],
      onChange,
    }) }), document.body);
    const tabs = document.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(tabs[1]);
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('security', expect.any(KeyboardEvent));
  });

  it('supports vertical Tabs navigation, manual Space activation, and safe selection fallbacks', async () => {
    const onChange = vi.fn();
    render(Tabs({
      labelledBy: 'settings-heading',
      value: 'missing',
      orientation: 'vertical',
      items: [
        { id: 'settings-profile', value: 'profile', label: 'Profile', panel: 'Profile panel' },
        { id: 'settings-security', value: 'security', label: 'Security', panel: 'Security panel' },
        { id: 'settings-billing', value: 'billing', label: 'Billing', panel: 'Billing panel' },
      ],
      onChange,
    }), document.body);
    const list = document.querySelector<HTMLElement>('[role="tablist"]')!;
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(list.getAttribute('aria-labelledby')).toBe('settings-heading');
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);

    tabs[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(tabs[1]);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(tabs[2]);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(tabs[0]);
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(tabs[2]);
    expect(onChange).toHaveBeenLastCalledWith('billing', expect.any(KeyboardEvent));

    render(Tabs({
      label: 'Manual sections',
      value: 'first',
      activation: 'manual',
      items: [
        { id: 'manual-first', value: 'first', label: 'First', panel: 'First panel' },
        { id: 'manual-second', value: 'second', label: 'Second', panel: 'Second panel' },
      ],
      onChange,
    }), document.body);
    const manualTabs = document.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    manualTabs[1]!.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith('second', expect.any(KeyboardEvent));

    render(Tabs({
      label: 'Unavailable sections',
      value: 'first',
      items: [
        { id: 'disabled-first', value: 'first', label: 'First', panel: 'First panel', disabled: true },
        { id: 'disabled-second', value: 'second', label: 'Second', panel: 'Second panel', disabled: true },
      ],
    }), document.body);
    expect([...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .every((tab) => tab.disabled && tab.tabIndex === -1)).toBe(true);
  });

  it('structures DialogSurface content and contains, dismisses, and restores focus', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open preferences';
    const root = document.createElement('div');
    document.body.append(trigger, root);
    trigger.focus();
    const controller = createDialogSurfaceController({ initialFocus: '[data-dialog-initial-focus]' });
    const dismiss = vi.fn(() => controller.deactivate());
    controller.activate(trigger);
    render(DialogSurface({
      id: 'preferences-dialog',
      labelledBy: 'preferences-title',
      title: 'Preferences',
      description: 'Choose how the application behaves.',
      placement: 'end',
      controller,
      onDismiss: dismiss,
      closeAction: q.button({ type: 'button', data: { dialogInitialFocus: true }, children: 'Close' }),
      children: q.input({ 'aria-label': 'Display name' }),
      footer: q.button({ type: 'button', children: 'Save' }),
      attributes: { data: { owner: 'settings' } },
    }), root);
    await Promise.resolve();

    const overlay = document.querySelector<HTMLElement>('.gluon-dialog-surface-overlay')!;
    const dialog = document.querySelector<HTMLElement>('#preferences-dialog')!;
    const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('preferences-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('preferences-dialog-description');
    expect(dialog.dataset.owner).toBe('settings');
    expect(dialog.classList).toContain('is-end');
    expect(controller.active).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);

    buttons[1]!.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(buttons[0]);
    overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dismiss).toHaveBeenCalledOnce();
    expect(controller.active).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps non-modal DialogSurface overlays inert when overlay dismissal is disabled', async () => {
    const controller = createDialogSurfaceController();
    const dismiss = vi.fn();
    const externalRef: { value?: HTMLDivElement } = {};
    const keydown = { handleEvent: vi.fn((event: KeyboardEvent) => {
      if (event.key === 'Tab') event.preventDefault();
    }) };
    const view = () => DialogSurface({
      id: 'passive-dialog',
      label: 'Passive dialog',
      modal: false,
      dismissOnOverlay: false,
      controller,
      onDismiss: dismiss,
      attributes: { ref: externalRef, onKeydown: keydown },
      children: 'Passive content',
    });
    render(view(), document.body);
    expect(externalRef.value?.id).toBe('passive-dialog');
    render(view(), document.body);
    externalRef.value!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(keydown.handleEvent).toHaveBeenCalledOnce();
    document.querySelector<HTMLElement>('.gluon-dialog-surface-overlay')!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dismiss).not.toHaveBeenCalled();
    document.querySelector<HTMLElement>('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(dismiss).toHaveBeenCalledOnce();
    expect(keydown.handleEvent).toHaveBeenCalledTimes(2);
    render(q.div({ children: 'Unmounted' }), document.body);
    expect(externalRef.value).toBeUndefined();
  });

  it('preserves native Disclosure open state, summary activation, and toggle events', async () => {
    const onToggle = vi.fn();
    render(Disclosure({
      id: 'shipping-details',
      summary: 'Shipping details',
      defaultOpen: true,
      onToggle,
      attributes: { data: { owner: 'policy' } },
      summaryAttributes: { data: { section: 'delivery' } },
      contentAttributes: { class: 'policy-copy' },
      children: 'Tracked delivery in 2–3 days.',
    }), document.body);
    const details = document.querySelector<HTMLDetailsElement>('#shipping-details')!;
    const summary = details.querySelector<HTMLElement>('summary')!;
    expect(details.open).toBe(true);
    expect(details.dataset.owner).toBe('policy');
    expect(summary.dataset.section).toBe('delivery');
    expect(details.querySelector('.policy-copy')?.textContent).toContain('Tracked delivery');
    summary.click();
    await vi.waitFor(() => expect(details.open).toBe(false));
    await vi.waitFor(() => expect(onToggle).toHaveBeenCalled());
  });

  it('controls Accordion single and multiple values while preserving native summaries', async () => {
    const onSingleChange = vi.fn();
    const items = [
      { id: 'shipping-tracking', value: 'tracking', summary: 'Tracking', children: 'Sent after dispatch.' },
      { id: 'shipping-packaging', value: 'packaging', summary: 'Packaging', children: 'Recyclable board.' },
      { id: 'shipping-remote', value: 'remote', summary: 'Remote areas', children: 'Allow one extra day.', unavailable: true, unavailableReason: 'Not available for this destination.' },
    ] as const;
    render(Accordion({
      label: 'Delivery service details',
      value: 'tracking',
      collapsible: false,
      items,
      onChange: onSingleChange,
    }), document.body);
    const details = [...document.querySelectorAll<HTMLDetailsElement>('.gluon-accordion > details')];
    const summaries = details.map((entry) => entry.querySelector<HTMLElement>('summary')!);
    expect(details.map((entry) => entry.open)).toEqual([true, false, false]);
    expect(summaries[0]?.querySelector('[role="heading"]')?.getAttribute('aria-level')).toBe('3');
    expect(onSingleChange).not.toHaveBeenCalled();

    summaries[1]!.click();
    await vi.waitFor(() => expect(onSingleChange).toHaveBeenCalledWith('packaging', expect.any(Event)));
    onSingleChange.mockClear();
    summaries[0]!.click();
    await vi.waitFor(() => expect(details[0]?.open).toBe(true));
    expect(onSingleChange).not.toHaveBeenCalled();

    summaries[0]!.focus();
    summaries[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(summaries[1]);
    summaries[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(summaries[1]);
    summaries[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(summaries[1]);

    const onMultipleChange = vi.fn();
    render(Accordion({
      labelledBy: 'delivery-title',
      mode: 'multiple',
      value: ['tracking'],
      items: items.slice(0, 2),
      onChange: onMultipleChange,
    }), document.body);
    document.querySelectorAll<HTMLElement>('.gluon-accordion summary')[0]!.click();
    await vi.waitFor(() => expect(onMultipleChange).toHaveBeenCalledWith([], expect.any(Event)));
    onMultipleChange.mockClear();
    render(Accordion({
      labelledBy: 'delivery-title',
      mode: 'multiple',
      value: ['tracking'],
      items: items.slice(0, 2),
      onChange: onMultipleChange,
    }), document.body);
    document.querySelectorAll<HTMLElement>('.gluon-accordion summary')[1]!.click();
    await vi.waitFor(() => expect(onMultipleChange).toHaveBeenCalledWith(['tracking', 'packaging'], expect.any(Event)));
  });

  it('maps InlineNotice feedback to deliberate live semantics and caller-owned actions', () => {
    const retry = vi.fn();
    const dismiss = vi.fn();
    render(q.main({ children: [
      InlineNotice({ children: 'Static account context.' }),
      InlineNotice({
        tone: 'success',
        title: 'Order confirmed',
        children: 'Delivery details were sent.',
        action: q.button({ type: 'button', onClick: retry, children: 'View order' }),
        dismissAction: q.button({ type: 'button', onClick: dismiss, children: 'Dismiss' }),
        attributes: { id: 'order-notice', data: { owner: 'checkout' } },
      }),
      InlineNotice({ tone: 'danger', children: 'Payment failed.' }),
      InlineNotice({ tone: 'warning', announcement: 'off', children: 'Static delivery note.' }),
    ] }), document.body);
    const notices = [...document.querySelectorAll<HTMLElement>('.gluon-inline-notice')];
    expect(notices[0]?.querySelector('[role]')).toBeNull();
    expect(notices[0]?.dataset.announcement).toBe('off');
    const successRegion = notices[1]!.querySelector<HTMLElement>('[role="status"]')!;
    expect(successRegion.getAttribute('aria-live')).toBe('polite');
    expect(successRegion.getAttribute('aria-atomic')).toBe('true');
    expect(successRegion.textContent).toContain('Order confirmed');
    expect(successRegion.querySelector('button')).toBeNull();
    expect(notices[1]?.dataset.owner).toBe('checkout');
    notices[1]!.querySelectorAll<HTMLButtonElement>('button')[0]!.click();
    notices[1]!.querySelectorAll<HTMLButtonElement>('button')[1]!.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
    expect(notices[2]?.querySelector('[role="alert"]')?.getAttribute('aria-live')).toBe('assertive');
    expect(notices[3]?.querySelector('[role]')).toBeNull();
  });

  it('renders EmptyState as static compact or full content with caller-owned recovery', () => {
    const recover = vi.fn();
    render(q.main({ children: [
      EmptyState({
        heading: 'No matching objects',
        headingLevel: 3,
        children: 'Clear the filters to see the complete collection.',
        illustration: Icon({ name: 'spark', label: 'Empty tray' }),
        action: q.button({ type: 'button', onClick: recover, children: 'Clear filters' }),
        attributes: { id: 'catalog-empty', data: { owner: 'catalog' } },
      }),
      EmptyState({ presentation: 'compact', heading: 'Bag is empty', children: 'Choose something useful.' }),
    ] }), document.body);
    const states = [...document.querySelectorAll<HTMLElement>('.gluon-empty-state')];
    expect(states[0]?.dataset.presentation).toBe('full');
    expect(states[0]?.dataset.owner).toBe('catalog');
    expect(states[0]?.querySelector('[role="heading"]')?.getAttribute('aria-level')).toBe('3');
    expect(states[0]?.querySelector('svg')?.getAttribute('aria-label')).toBe('Empty tray');
    expect(states[0]?.querySelector('[role="status"], [role="alert"], [aria-live]')).toBeNull();
    states[0]!.querySelector<HTMLButtonElement>('button')!.click();
    expect(recover).toHaveBeenCalledOnce();
    expect(states[1]?.classList.contains('is-compact')).toBe(true);
  });

  it('adds a TableRegion viewport Tab stop only while the native table overflows', async () => {
    render(q.main({ children: [
      q.h2({ id: 'orders-title', children: 'Recent orders' }),
      TableRegion({
        id: 'orders-table',
        labelledBy: 'orders-title',
        summary: 'Two recent orders.',
        scrollHint: 'Scroll horizontally to review every column.',
        attributes: { data: { owner: 'orders' } },
        children: q.table({ children: q.tbody({ children: q.tr({ children: [q.th({ scope: 'row', children: 'A-101' }), q.td({ children: 'Ready' })] }) }) }),
      }),
      TableRegion({ label: 'Archived orders', id: 'archived-orders', empty: true, emptyContent: q.p({ children: 'No archived orders.' }) }),
    ] }), document.body);

    const region = document.querySelector<HTMLElement>('#orders-table')!;
    const viewport = region.querySelector<HTMLElement>('.gluon-table-region-viewport')!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-labelledby')).toBe('orders-title');
    expect(region.getAttribute('aria-describedby')).toBe('orders-table-summary');
    expect(region.dataset.owner).toBe('orders');
    expect(region.querySelector('table')).not.toBeNull();
    expect(viewport.tabIndex).toBe(-1);
    expect(region.querySelector<HTMLElement>('.gluon-table-region-scroll-hint')?.hidden).toBe(true);

    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 420 });
    window.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(region.hasAttribute('data-overflow')).toBe(true));
    expect(viewport.tabIndex).toBe(0);
    expect(region.querySelector<HTMLElement>('.gluon-table-region-scroll-hint')?.hidden).toBe(false);

    Object.defineProperty(viewport, 'scrollWidth', { configurable: true, value: 200 });
    window.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(region.hasAttribute('data-overflow')).toBe(false));
    expect(viewport.tabIndex).toBe(-1);
    expect(document.querySelector('#archived-orders .gluon-table-region-viewport')).toBeNull();
    expect(document.querySelector('#archived-orders')?.textContent).toContain('No archived orders.');
  });

  it('keeps unavailable Disclosure summaries focusable with a visible reason', () => {
    const summaryClick = vi.fn();
    const summaryKeydown = vi.fn();
    const attributeToggle = vi.fn((event: Event) => event.preventDefault());
    const onToggle = vi.fn();
    render(Disclosure({
      id: 'repair-history',
      summary: 'Repair history',
      open: false,
      unavailable: true,
      unavailableReason: 'Available after the first repair.',
      onToggle,
      attributes: { '@toggle': attributeToggle },
      summaryAttributes: { onClick: summaryClick, onKeydown: summaryKeydown },
      children: 'No repairs yet.',
    }), document.body);
    const details = document.querySelector<HTMLDetailsElement>('#repair-history')!;
    const summary = details.querySelector<HTMLElement>('summary')!;
    expect(summary.tabIndex).toBe(0);
    expect(summary.getAttribute('aria-disabled')).toBe('true');
    expect(summary.getAttribute('aria-describedby')).toBe('repair-history-unavailable');
    expect(details.querySelector('#repair-history-unavailable')?.textContent).toContain('first repair');
    summary.click();
    expect(summaryClick).toHaveBeenCalledOnce();
    expect(details.open).toBe(false);
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    summary.dispatchEvent(enter);
    expect(summaryKeydown).toHaveBeenCalledOnce();
    expect(enter.defaultPrevented).toBe(true);
    details.dispatchEvent(new Event('toggle', { cancelable: true }));
    expect(attributeToggle).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('renders Textarea as a native controlled multiline control with explicit states', () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    render(Textarea({
      value: 'Workshop entrance',
      name: 'instructions',
      placeholder: 'Delivery notes',
      readOnly: true,
      required: true,
      invalid: true,
      rows: 4,
      fullWidth: true,
      onInput,
      onChange,
      attributes: { id: 'delivery-notes', data: { owner: 'checkout' } },
    }), document.body);

    const textarea = document.querySelector<HTMLTextAreaElement>('#delivery-notes')!;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.value).toBe('Workshop entrance');
    expect(textarea.name).toBe('instructions');
    expect(textarea.placeholder).toBe('Delivery notes');
    expect(textarea.readOnly).toBe(true);
    expect(textarea.required).toBe(true);
    expect(textarea.rows).toBe(4);
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.classList).toContain('is-full-width');
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onInput).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('renders Select as a native controlled control with explicit public states', () => {
    const onChange = vi.fn();
    render(Select({
      value: 'weekly',
      name: 'digest',
      size: 'large',
      disabled: true,
      required: true,
      invalid: true,
      fullWidth: true,
      onChange,
      attributes: { id: 'digest-frequency', data: { owner: 'account' } },
      children: [
        q.option({ value: 'daily', children: 'Daily' }),
        q.option({ value: 'weekly', children: 'Weekly' }),
      ],
    }), document.body);

    const select = document.querySelector<HTMLSelectElement>('#digest-frequency')!;
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('weekly');
    expect(select.name).toBe('digest');
    expect(select.disabled).toBe(true);
    expect(select.required).toBe(true);
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.dataset.owner).toBe('account');
    expect(select.classList).toContain('is-large');
    expect(select.classList).toContain('is-full-width');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('does not adopt styles at import time and reuses explicit theme sheets', () => {
    expect(document.adoptedStyleSheets).toEqual([]);
    expect(getThemeStyles('light')).toBe(getThemeStyles('light'));
    expect(getThemeStyles('dark')).toBe(getThemeStyles('dark'));

    const uninstall = installUiTheme(document, 'dark');
    const uninstallSecondOwner = installUiTheme(document, 'dark');
    expect(document.adoptedStyleSheets).toHaveLength(2);
    uninstall();
    uninstall();
    expect(document.adoptedStyleSheets).toHaveLength(2);
    uninstallSecondOwner();
    expect(document.adoptedStyleSheets).toEqual([]);

    adoptStyles(document, uiTokenStyles);
    const uninstallWithExternalToken = installUiTheme(document, 'light');
    expect(document.adoptedStyleSheets).toHaveLength(2);
    uninstallWithExternalToken();
    expect(document.adoptedStyleSheets).toHaveLength(1);
    expect(document.adoptedStyleSheets[0]).toBe(uiTokenStyles);
    unadoptStyles(document, uiTokenStyles);

    expect(getStyleSheetText(atomStyles)).toContain('padding-inline');
    expect(getStyleSheetText(moleculeStyles)).toContain('padding-inline');
    expect(getStyleSheetText(organismStyles)).toContain('min-block-size');
  });

  it('installs one ref-counted UI owner and switches one theme sheet in place', () => {
    const before = new CSSStyleSheet();
    const after = new CSSStyleSheet();
    const component = new CSSStyleSheet();
    document.documentElement.setAttribute('data-gluon-theme', 'system');
    document.adoptedStyleSheets = [before];
    const first = installUi(document, { theme: 'light' });
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, after];
    const second = installUi(document, { theme: 'dark' });
    expect(first.disposed).toBe(false);
    const themeSheet = first.themeSheet;

    expect(first.theme).toBe('dark');
    expect(second.theme).toBe('dark');
    expect(first.themeSheet).toBe(second.themeSheet);
    expect(document.documentElement.dataset.gluonTheme).toBe('dark');
    expect(document.adoptedStyleSheets[0]).toBe(before);
    expect(document.adoptedStyleSheets.at(-1)).toBe(after);
    expect(new Set(document.adoptedStyleSheets).size).toBe(document.adoptedStyleSheets.length);

    first.setTheme('light');
    first.setTheme('dark');
    first.setTheme('dark');
    expect(first.themeSheet).toBe(themeSheet);
    expect(getStyleSheetText(themeSheet)).toContain('--gluon-color-canvas: #101716');
    expect(document.adoptedStyleSheets.filter((sheet) => sheet === themeSheet)).toHaveLength(1);

    first.styleOwner.retain(component);
    second.styleOwner.retain(component);
    first.dispose();
    first.dispose();
    expect(first.disposed).toBe(true);
    expect(document.adoptedStyleSheets).toContain(component);
    expect(document.adoptedStyleSheets).toContain(themeSheet);
    second.dispose();
    expect(document.adoptedStyleSheets).toHaveLength(2);
    expect(document.adoptedStyleSheets[0]).toBe(before);
    expect(document.adoptedStyleSheets[1]).toBe(after);
    expect(document.documentElement.dataset.gluonTheme).toBe('system');
    expect(() => first.setTheme('light')).toThrow('disposed');
    document.documentElement.removeAttribute('data-gluon-theme');
  });

  it('preserves a theme attribute changed by another owner and rejects invalid targets', () => {
    const owner = installUi(document);
    document.documentElement.dataset.gluonTheme = 'external';
    owner.dispose();
    expect(document.documentElement.dataset.gluonTheme).toBe('external');
    document.documentElement.removeAttribute('data-gluon-theme');

    expect(() => installUi({ documentElement: null } as unknown as Document))
      .toThrow('requires a documentElement');

    const host = document.createElement('section');
    const failingTarget = {
      host,
      querySelectorAll: () => [],
      get adoptedStyleSheets() { return [] as CSSStyleSheet[]; },
      set adoptedStyleSheets(_sheets: CSSStyleSheet[]) { throw new Error('adoption failed'); },
    } as unknown as ShadowRoot;
    expect(() => installUi(failingTarget)).toThrow('adoption failed');
    expect(host.hasAttribute('data-gluon-theme')).toBe(false);
  });

  it('installs independent nested ShadowRoot owners with host-scoped tokens', () => {
    const outerHost = document.createElement('section');
    const outer = outerHost.attachShadow({ mode: 'open' });
    const innerHost = document.createElement('article');
    outer.append(innerHost);
    const inner = innerHost.attachShadow({ mode: 'open' });
    const outerOwner = installUi(outer, { theme: 'dark' });
    const innerOwner = installUi(inner, { theme: 'light' });

    expect(outerHost.dataset.gluonTheme).toBe('dark');
    expect(innerHost.dataset.gluonTheme).toBe('light');
    expect(outerOwner.themeSheet).not.toBe(innerOwner.themeSheet);
    expect(outer.adoptedStyleSheets).toHaveLength(4);
    expect(inner.adoptedStyleSheets).toHaveLength(4);
    outerOwner.setTheme('light');
    expect(innerOwner.theme).toBe('light');
    outerOwner.dispose();
    expect(outer.adoptedStyleSheets).toEqual([]);
    expect(inner.adoptedStyleSheets).toHaveLength(4);
    innerOwner.dispose();
  });

  it('serializes one named UI selection and consumes matching hydration carriers', () => {
    const host = document.createElement('section');
    const root = host.attachShadow({ mode: 'open' });
    const selection = createUiStyleSelection('dark');
    const manifest = createStyleManifest(selection);
    root.innerHTML = renderStyleCarriers(manifest);
    expect(manifest.entries.map((entry) => entry.id)).toEqual([
      'gluon-ui-layer-order',
      'gluon-ui-foundation',
      'gluon-ui-tokens',
      'gluon-ui-theme',
    ]);
    expect(manifest.entries.every((entry) => entry.scope === 'gluon-ui')).toBe(true);

    const owner = installUi(root, { theme: 'dark', hydrate: true });
    expect(root.querySelectorAll('style[data-gluon-style]')).toHaveLength(0);
    expect(root.adoptedStyleSheets).toHaveLength(4);
    expect(owner.selection.entries.map((entry) => entry.id)).toEqual(
      selection.entries.map((entry) => entry.id),
    );
    owner.dispose();
  });

  it.each([
    ['missing', (html: string) => html.replace(/<style[^>]+gluon-ui-theme[\s\S]*?<\/style>/, '')],
    ['duplicate', (html: string) => `${html}${html.match(/<style[^>]+gluon-ui-theme[\s\S]*?<\/style>/)?.[0] ?? ''}`],
    ['reordered', (html: string) => {
      const carriers = html.match(/<style[\s\S]*?<\/style>/g) ?? [];
      return [carriers[1], carriers[0], ...carriers.slice(2)].join('');
    }],
    ['mismatched', (html: string) => html.replace('data-gluon-digest="', 'data-gluon-digest="invalid-')],
  ] as const)('reports deterministic %s UI hydration diagnostics', (mismatch, mutate) => {
    const host = document.createElement('section');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = mutate(renderStyleCarriers(createStyleManifest(createUiStyleSelection('light'))));
    expect(() => installUi(root, { hydrate: true })).toThrowError(
      expect.objectContaining<Partial<UiHydrationError>>({
        code: 'GLUON_UI_HYDRATION_MISMATCH',
        mismatch,
      }),
    );
    expect(root.adoptedStyleSheets).toEqual([]);
    expect(host.hasAttribute('data-gluon-theme')).toBe(false);
  });

  it('distinguishes extra, unnamed, and CSS-text UI hydration evidence', () => {
    const manifestHtml = renderStyleCarriers(createStyleManifest(createUiStyleSelection('light')));

    const extraHost = document.createElement('section');
    const extraRoot = extraHost.attachShadow({ mode: 'open' });
    extraRoot.innerHTML = `${manifestHtml}<style data-gluon-style="extra" data-gluon-style-scope="gluon-ui" data-gluon-digest="extra"></style>`;
    expect(() => installUi(extraRoot, { hydrate: true })).toThrowError(
      expect.objectContaining({ mismatch: 'mismatched' }),
    );

    const unnamedHost = document.createElement('section');
    const unnamedRoot = unnamedHost.attachShadow({ mode: 'open' });
    unnamedRoot.innerHTML = manifestHtml;
    unnamedRoot.querySelector('style')?.removeAttribute('data-gluon-style');
    expect(() => installUi(unnamedRoot, { hydrate: true })).toThrowError(
      expect.objectContaining({ mismatch: 'missing' }),
    );

    const textHost = document.createElement('section');
    const textRoot = textHost.attachShadow({ mode: 'open' });
    textRoot.innerHTML = manifestHtml;
    const themeCarrier = textRoot.querySelector<HTMLStyleElement>('style[data-gluon-style="gluon-ui-theme"]')!;
    themeCarrier.textContent = `${themeCarrier.textContent ?? ''}\n:root { --unexpected: 1; }`;
    expect(() => installUi(textRoot, { hydrate: true })).toThrowError(
      expect.objectContaining({ mismatch: 'mismatched' }),
    );
  });

  it('publishes stable manifest evidence for every UI layer', () => {
    const manifests = [quarkManifest, atomManifest, moleculeManifest, organismManifest];
    expect(manifests.map((manifest) => manifest.package)).toEqual([
      '@gluonjs/quarks',
      '@gluonjs/atoms',
      '@gluonjs/molecules',
      '@gluonjs/organisms',
    ]);
    for (const manifest of manifests) {
      expect(manifest.schemaVersion).toBe(1);
      expect(manifest.entries.length).toBeGreaterThan(0);
      for (const entry of manifest.entries) {
        expect(entry.status).toBe('stable');
        expect(entry.accessibility.length).toBeGreaterThan(20);
        expect(entry.extension.length).toBeGreaterThan(20);
        expect(entry.example).toBe('docs-site/examples/ui-system.ts');
        expect(entry.tests).toContain('tests/ui-system.spec.ts');
      }
    }
  });
});

describe('headless interaction primitives', () => {
  it('moves, contains, and restores focus through a focus scope', () => {
    document.body.innerHTML = '<button id="trigger">Open</button><section id="scope" tabindex="-1"><button id="first">First</button><button id="last">Last</button></section>';
    const trigger = document.querySelector<HTMLButtonElement>('#trigger')!;
    const container = document.querySelector<HTMLElement>('#scope')!;
    const first = document.querySelector<HTMLButtonElement>('#first')!;
    const last = document.querySelector<HTMLButtonElement>('#last')!;
    trigger.focus();

    const scope = createFocusScope(container, { returnFocus: trigger });
    expect(scope.active).toBe(false);
    scope.activate();
    scope.activate();
    expect(scope.active).toBe(true);
    expect(document.activeElement).toBe(first);

    last.focus();
    const forward = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    scope.handleKeydown(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
    scope.handleKeydown(backward);
    expect(document.activeElement).toBe(last);
    scope.deactivate();
    scope.deactivate();
    expect(document.activeElement).toBe(trigger);
  });

  it('resolves every initial-focus form and handles empty or externally focused scopes', () => {
    document.body.innerHTML = '<button id="trigger">Open</button><section id="scope" tabindex="-1"><button hidden>Hidden</button><button aria-hidden="true">ARIA hidden</button><button id="visible">Visible</button></section><section id="empty" tabindex="-1"></section>';
    const trigger = document.querySelector<HTMLButtonElement>('#trigger')!;
    const container = document.querySelector<HTMLElement>('#scope')!;
    const visible = document.querySelector<HTMLButtonElement>('#visible')!;
    trigger.focus();
    expect(getFocusableElements(container)).toEqual([visible]);

    const functionTarget = createFocusScope(container, { initialFocus: () => visible });
    functionTarget.activate();
    expect(document.activeElement).toBe(visible);
    functionTarget.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    trigger.focus();
    const outside = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    functionTarget.handleKeydown(outside);
    expect(outside.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(visible);
    functionTarget.deactivate();

    const elementTarget = createFocusScope(container, { initialFocus: visible, returnFocus: trigger });
    elementTarget.activate();
    expect(document.activeElement).toBe(visible);
    elementTarget.deactivate();

    const empty = document.querySelector<HTMLElement>('#empty')!;
    const emptyScope = createFocusScope(empty, { initialFocus: '.missing', returnFocus: null });
    emptyScope.activate();
    expect(document.activeElement).toBe(empty);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    emptyScope.handleKeydown(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(empty);
    emptyScope.deactivate();
  });

  it('enforces dialog naming, overlay dismissal, native popover, and listbox keys', () => {
    const dismiss = vi.fn();
    const change = vi.fn();
    expect(() => Dialog({ children: 'Missing name' } as DialogProps)).toThrow(/requires label or labelledBy/i);

    render(q.div({ children: [
      Overlay({ onDismiss: dismiss, children: Dialog({ label: 'Preferences', children: 'Dialog body' }) }),
      Popover({ id: 'details', children: 'Popover body' }),
      Listbox({
        id: 'finish',
        label: 'Finish',
        value: 'black',
        onChange: change,
        options: [
          { value: 'black', label: 'Black' },
          { value: 'blue', label: 'Blue' },
          { value: 'sold', label: 'Sold out', disabled: true },
        ],
      }),
      Field({ label: 'Email', helper: 'Order updates', children: q.input({ type: 'email' }) }),
    ] }), document.body);

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-label')).toBe('Preferences');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.querySelector('#details')?.getAttribute('popover')).toBe('auto');
    document.querySelector<HTMLElement>('[role="listbox"]')!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    }));
    expect(change).toHaveBeenCalledWith('blue');
    document.querySelector<HTMLElement>('.gluon-overlay')!.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
    }));
    expect(dismiss).toHaveBeenCalledOnce();
    expect(document.querySelector('.gluon-field input')).not.toBeNull();
  });

  it('covers controlled headless dismissal, listbox boundaries, and validation variants', () => {
    const dismiss = vi.fn();
    const dialogKeydown = vi.fn();
    const listboxKeydown = vi.fn();
    const changes: string[] = [];
    render(q.div({ children: [
      Overlay({ children: Dialog({
        labelledBy: 'dialog-heading',
        modal: false,
        onDismiss: dismiss,
        attributes: { tabIndex: 2, aria: { describedby: 'dialog-copy' }, onKeydown: dialogKeydown },
        children: [
          q.h2({ id: 'dialog-heading', children: 'Preferences' }),
          q.p({ id: 'dialog-copy', children: 'Dialog copy' }),
        ],
      }) }),
      Popover({ id: 'manual-help', mode: 'manual', attributes: { tabIndex: 1 }, children: 'Help' }),
      Listbox({
        id: 'sizes',
        label: 'Size',
        value: 'missing',
        onChange: (value) => changes.push(value),
        attributes: { tabIndex: 3, aria: { describedby: 'size-help' }, onKeydown: listboxKeydown },
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large', disabled: true },
        ],
      }),
      Field({ label: 'Code', error: 'Code is required', children: q.input({ name: 'code' }) }),
      Field({ label: 'Optional', children: q.input({ name: 'optional' }) }),
    ] }), document.body);

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.tabIndex).toBe(2);
    expect(dialog.getAttribute('aria-describedby')).toBe('dialog-copy');
    expect(dialog.getAttribute('aria-labelledby')).toBe('dialog-heading');
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(dismiss).toHaveBeenCalledOnce();
    expect(dialogKeydown).toHaveBeenCalledTimes(2);
    expect(document.querySelector('#manual-help')?.getAttribute('popover')).toBe('manual');

    const listbox = document.querySelector<HTMLElement>('#sizes')!;
    for (const key of ['End', 'Home', 'ArrowUp', 'ArrowDown', 'Enter']) {
      listbox.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    expect(changes).toEqual(['medium', 'small', 'medium', 'medium']);
    expect(listboxKeydown).toHaveBeenCalledTimes(5);
    document.querySelector<HTMLElement>('#sizes-option-large')!.click();
    document.querySelector<HTMLElement>('#sizes-option-medium')!.click();
    expect(changes.at(-1)).toBe('medium');
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Code is required');
  });

  it('keeps empty listboxes and overlays without callbacks inert', () => {
    const pointerListener = { handleEvent: vi.fn() };
    render(q.div({ children: [
      Overlay({ children: 'Surface', attributes: { onPointerDown: pointerListener } }),
      Listbox({ id: 'empty-list', label: 'Empty', options: [] }),
    ] }), document.body);
    document.querySelector<HTMLElement>('.gluon-overlay')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(pointerListener.handleEvent).toHaveBeenCalledOnce();
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.querySelector<HTMLElement>('#empty-list')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('overflow-aware navigation', () => {
  it('exposes native controls, updates overflow edges, and reveals the aria-current destination', async () => {
    const uiOwner = installUi(document, { theme: 'light' });
    const destination = (label: string, current = false) => q.a({
      href: `#${label.toLowerCase()}`,
      'aria-current': current ? 'page' : undefined,
      style: {
        'align-items': 'center',
        display: 'inline-flex',
        flex: '0 0 8rem',
        'min-block-size': '2.75rem',
      },
      children: label,
    });

    render(NavigationStrip({
      label: 'Mission sections',
      attributes: { style: { 'inline-size': '16rem' } },
      children: [
        destination('Overview', true),
        destination('Runs'),
        destination('Operations'),
        destination('Repositories'),
      ],
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-navigation-strip')!;
    const viewport = root.querySelector<HTMLElement>('.gluon-navigation-strip-viewport')!;
    const previous = root.querySelector<HTMLButtonElement>('.is-previous')!;
    const next = root.querySelector<HTMLButtonElement>('.is-next')!;
    await vi.waitFor(() => expect(root.hasAttribute('data-overflow')).toBe(true));

    expect(root.tagName).toBe('NAV');
    expect(root.getAttribute('aria-label')).toBe('Mission sections');
    expect(previous.getAttribute('aria-label')).toBe('Show previous navigation items');
    expect(next.getAttribute('aria-label')).toBe('Show more navigation items');
    expect(previous.hidden).toBe(false);
    expect(previous.disabled).toBe(true);
    expect(next.hidden).toBe(false);
    expect(next.disabled).toBe(false);

    next.focus();
    next.click();
    await vi.waitFor(() => expect(viewport.scrollLeft).toBeGreaterThan(1));
    expect(document.activeElement).toBe(next);
    await vi.waitFor(() => expect(previous.disabled).toBe(false));
    const afterNext = viewport.scrollLeft;
    previous.click();
    await vi.waitFor(() => expect(viewport.scrollLeft).toBeLessThan(afterNext));
    await vi.waitFor(() => expect(previous.disabled).toBe(true));
    viewport.dispatchEvent(new Event('scroll'));
    viewport.dispatchEvent(new Event('scroll'));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const overview = root.querySelector<HTMLAnchorElement>('[href="#overview"]')!;
    overview.setAttribute('aria-current', 'step');
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    root.querySelector('[aria-current]')?.removeAttribute('aria-current');
    const repositories = root.querySelector<HTMLAnchorElement>('[href="#repositories"]')!;
    repositories.setAttribute('aria-current', 'page');
    await vi.waitFor(() => {
      const viewportRect = viewport.getBoundingClientRect();
      const currentRect = repositories.getBoundingClientRect();
      expect(currentRect.left).toBeGreaterThanOrEqual(viewportRect.left - 1);
      expect(currentRect.right).toBeLessThanOrEqual(viewportRect.right + 1);
      expect(next.disabled).toBe(false);
      expect(next.getAttribute('aria-disabled')).toBe('true');
    });
    expect(document.activeElement).toBe(next);
    previous.focus();
    await vi.waitFor(() => expect(next.disabled).toBe(true));
    expect(next.hasAttribute('aria-disabled')).toBe(false);
    repositories.removeAttribute('aria-current');
    overview.setAttribute('aria-current', 'page');
    await vi.waitFor(() => expect(overview.getBoundingClientRect().left)
      .toBeGreaterThanOrEqual(viewport.getBoundingClientRect().left - 1));
    uiOwner.dispose();
  });

  it('removes redundant controls when every destination fits', async () => {
    render(NavigationStrip({
      label: 'Short navigation',
      attributes: { style: { 'inline-size': '30rem' } },
      children: q.a({ href: '#only', 'aria-current': 'page', children: 'Only destination' }),
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-navigation-strip')!;
    await vi.waitFor(() => expect(root.hasAttribute('data-overflow')).toBe(false));
    expect([...root.querySelectorAll<HTMLButtonElement>('.gluon-navigation-strip-control')]
      .every((control) => control.hidden && control.disabled)).toBe(true);
  });

  it('keeps a focused control available until a compact strip can release focus', async () => {
    const uiOwner = installUi(document, { theme: 'light' });
    const rootRef = { value: undefined as HTMLElement | undefined };
    render(NavigationStrip({
      label: 'Responsive navigation',
      attributes: { ref: rootRef, style: { 'inline-size': '16rem' } },
      children: ['One', 'Two', 'Three', 'Four'].map((label) => q.a({
        href: `#${label.toLowerCase()}`,
        style: {
          'align-items': 'center',
          display: 'inline-flex',
          flex: '0 0 8rem',
          'min-block-size': '2.75rem',
        },
        children: label,
      })),
    }), document.body);

    const root = rootRef.value!;
    const viewport = root.querySelector<HTMLElement>('.gluon-navigation-strip-viewport')!;
    const next = root.querySelector<HTMLButtonElement>('.is-next')!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 160 },
      scrollWidth: { configurable: true, value: 320 },
    });
    viewport.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => expect(root.hasAttribute('data-overflow')).toBe(true));
    next.focus();
    expect(document.activeElement).toBe(next);

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 320 },
      scrollWidth: { configurable: true, value: 320 },
    });
    viewport.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => {
      expect(root.hasAttribute('data-overflow')).toBe(false);
      expect(next.hidden).toBe(false);
      expect(next.disabled).toBe(false);
      expect(next.getAttribute('aria-disabled')).toBe('true');
    });

    next.blur();
    await vi.waitFor(() => expect(next.hidden && next.disabled).toBe(true));
    expect(next.hasAttribute('aria-disabled')).toBe(false);
    uiOwner.dispose();
  });

  it('ignores destinations explicitly marked as not current', async () => {
    const uiOwner = installUi(document, { theme: 'light' });
    const rootRef = { value: undefined as HTMLElement | undefined };
    render(NavigationStrip({
      label: 'Unselected navigation',
      attributes: { ref: rootRef, style: { 'inline-size': '16rem' } },
      children: ['One', 'Two', 'Three', 'Four'].map((label) => q.a({
        href: `#${label.toLowerCase()}`,
        'aria-current': label === 'Four' ? 'false' : undefined,
        style: {
          'align-items': 'center',
          display: 'inline-flex',
          flex: '0 0 8rem',
          'min-block-size': '2.75rem',
        },
        children: label,
      })),
    }), document.body);

    const root = rootRef.value!;
    const viewport = root.querySelector<HTMLElement>('.gluon-navigation-strip-viewport')!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 160 },
      scrollWidth: { configurable: true, value: 320 },
    });
    viewport.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => expect(root.hasAttribute('data-overflow')).toBe(true));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(viewport.scrollLeft).toBeLessThanOrEqual(1);
    uiOwner.dispose();
  });

  it('tolerates deferred content and controls while an update is scheduled', async () => {
    const rootRef = { value: undefined as HTMLElement | undefined };
    render(NavigationStrip({
      label: 'Changing navigation',
      attributes: { ref: rootRef },
      children: q.a({ href: '#one', children: 'One' }),
    }), document.body);

    const root = rootRef.value!;
    const viewport = root.querySelector<HTMLElement>('.gluon-navigation-strip-viewport')!;
    root.querySelector('.gluon-navigation-strip-content')?.remove();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    root.querySelector('.is-previous')?.remove();
    viewport.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(root.isConnected).toBe(true);
  });

  it('initializes without optional platform observers', async () => {
    const resizeObserver = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    const mutationObserver = Object.getOwnPropertyDescriptor(window, 'MutationObserver');
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: undefined });
    Object.defineProperty(window, 'MutationObserver', { configurable: true, value: undefined });
    try {
      render(NavigationStrip({
        label: 'Observer-free navigation',
        attributes: { style: { 'inline-size': '30rem' } },
        children: q.a({ href: '#only', children: 'Only destination' }),
      }), document.body);

      const root = document.querySelector<HTMLElement>('.gluon-navigation-strip')!;
      await vi.waitFor(() => expect(root.hasAttribute('data-overflow')).toBe(false));
    } finally {
      if (resizeObserver) Object.defineProperty(window, 'ResizeObserver', resizeObserver);
      else delete (window as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
      if (mutationObserver) Object.defineProperty(window, 'MutationObserver', mutationObserver);
      else delete (window as { MutationObserver?: typeof MutationObserver }).MutationObserver;
    }
  });

  it('keeps the controller stable when the same strip is rendered again', async () => {
    const navigation = () => NavigationStrip({
      label: 'Stable navigation',
      attributes: { style: { 'inline-size': '30rem' } },
      children: q.a({ href: '#only', children: 'Only destination' }),
    });

    render(navigation(), document.body);
    const original = document.querySelector<HTMLElement>('.gluon-navigation-strip')!;
    render(navigation(), document.body);

    expect(document.querySelector<HTMLElement>('.gluon-navigation-strip')).toBe(original);
    await vi.waitFor(() => expect(original.hasAttribute('data-overflow')).toBe(false));
  });

  it('accounts for the controls before revealing an initially current destination', async () => {
    render(NavigationStrip({
      label: 'Initial destination',
      attributes: { style: { 'inline-size': '16rem' } },
      children: ['One', 'Two', 'Three', 'Four'].map((label) => q.a({
        href: `#${label.toLowerCase()}`,
        'aria-current': label === 'Four' ? 'page' : undefined,
        style: { display: 'inline-block', flex: '0 0 8rem' },
        children: label,
      })),
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-navigation-strip')!;
    const viewport = root.querySelector<HTMLElement>('.gluon-navigation-strip-viewport')!;
    const current = root.querySelector<HTMLElement>('[aria-current="page"]')!;
    await vi.waitFor(() => {
      const viewportRect = viewport.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      expect(root.querySelector<HTMLButtonElement>('.is-next')?.disabled).toBe(true);
      expect(currentRect.left).toBeGreaterThanOrEqual(viewportRect.left - 1);
      expect(currentRect.right).toBeLessThanOrEqual(viewportRect.right + 1);
    });
  });

  it('keeps caller-owned labels and object refs on a compact strip', async () => {
    const rootRef = { value: undefined as HTMLElement | undefined };
    render(NavigationStrip({
      label: 'Compact navigation',
      previousLabel: 'Earlier destinations',
      nextLabel: 'Later destinations',
      attributes: { ref: rootRef, style: { 'inline-size': '30rem' } },
      children: q.a({ href: '#only', 'aria-current': 'page', children: 'Only destination' }),
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-navigation-strip')!;
    expect(rootRef.value).toBe(root);
    expect(root.querySelector<HTMLButtonElement>('.is-previous')?.getAttribute('aria-label'))
      .toBe('Earlier destinations');
    expect(root.querySelector<HTMLButtonElement>('.is-next')?.getAttribute('aria-label'))
      .toBe('Later destinations');
  });

  it('uses logical RTL scrolling when the platform has no scrollBy helper', async () => {
    const assigned: Array<HTMLElement | undefined> = [];
    render(NavigationStrip({
      label: 'RTL navigation',
      attributes: {
        dir: 'rtl',
        ref: (element) => { assigned.push(element); },
        style: { 'inline-size': '16rem' },
      },
      children: ['One', 'Two', 'Three', 'Four'].map((label) => q.a({
        href: `#${label.toLowerCase()}`,
        style: { display: 'inline-block', flex: '0 0 8rem' },
        children: label,
      })),
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-navigation-strip')!;
    const viewport = root.querySelector<HTMLElement>('.gluon-navigation-strip-viewport')!;
    const next = root.querySelector<HTMLButtonElement>('.is-next')!;
    Object.defineProperty(viewport, 'scrollBy', { configurable: true, value: undefined });
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 160 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
      scrollWidth: { configurable: true, value: 320 },
    });

    await vi.waitFor(() => expect(root.hasAttribute('data-overflow')).toBe(true));
    expect(assigned).toContain(root);
    expect(viewport.ownerDocument.defaultView?.getComputedStyle(viewport).direction).toBe('rtl');
    next.click();
    await vi.waitFor(() => expect(viewport.scrollLeft).toBeLessThan(-1));
    expect(root.querySelector<HTMLButtonElement>('.is-previous')?.disabled).toBe(false);
  });
});

it('keeps the stable composed UI surface free of automated WCAG A/AA violations', async () => {
  const uiOwner = installUi(document, { theme: 'light' });
  render(AppShell({
    header: q.h1({ children: 'Account settings' }),
    navigation: q.a({ href: '#profile', children: 'Profile' }),
    children: [
      NavigationStrip({
        label: 'Account sections',
        children: [
          q.a({ href: '#profile', 'aria-current': 'page', children: 'Profile' }),
          q.a({ href: '#security', children: 'Security' }),
        ],
      }),
      Card({
        title: 'Profile',
        subtitle: 'Visible account details',
        actions: Button({ label: 'Save profile' }),
        children: [
          FormField({ label: 'Name', value: 'Ada', helper: 'Shown on receipts' }),
          FormField({ label: 'Email', value: 'invalid', error: 'Enter a valid email address' }),
          ControlField({ id: 'account-reference', label: 'Account reference', helper: 'Optional internal reference', control: (relationships) => Input({ attributes: { id: relationships.controlId, aria: relationships.aria } }) }),
          q.p({ children: [Icon({ name: 'spark', label: 'Verified' }), ' Verified account'] }),
          Input({ attributes: { 'aria-label': 'Search settings' } }),
          Select({
            value: 'daily',
            required: true,
            attributes: { 'aria-label': 'Digest frequency' },
            children: [
              q.option({ value: 'daily', children: 'Daily' }),
              q.option({ value: 'weekly', children: 'Weekly' }),
            ],
          }),
          Textarea({ value: 'Only account-related notes', attributes: { 'aria-label': 'Account notes' } }),
          q.label({ children: ['Notification volume', Slider({ defaultValue: 40, valueText: '40 percent' })] }),
          q.label({ children: [Checkbox({ name: 'updates' }), ' Product updates'] }),
        ],
      }),
    ],
    footer: 'Privacy controls',
  }), document.body);

  const results = await axe.run(document, {
    resultTypes: ['violations'],
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
  });
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
  uiOwner.dispose();
});

function formatViolations(violations: readonly Result[]): string {
  return violations.map((violation) => [
    `${violation.id}: ${violation.help}`,
    ...violation.nodes.map((node) => `${node.target.join(' ')} — ${node.failureSummary ?? 'failed'}`),
  ].join('\n')).join('\n');
}
