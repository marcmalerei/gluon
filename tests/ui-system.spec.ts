import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import axe, { type Result } from 'axe-core';
import {
  Button,
  AspectRatio,
  Avatar,
  Badge,
  aspectRatioStyles,
  avatarStyles,
  Checkbox,
  DateInput,
  FileInput,
  Heading,
  Image,
  Icon,
  Input,
  Link,
  Meter,
  NumberInput,
  Progress,
  Slider,
  normalizeSliderRange,
  normalizeSliderValue,
  Radio,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Switch,
  Text,
  TimeInput,
  accessibilityStyles,
  focusRingAttributes,
  ToggleButton,
  defineToggleButtonPreset,
  Textarea,
  ScrollArea,
  scrollAreaStyles,
  Separator,
  separatorStyles,
  atomManifest,
  atomStyles,
  createUiStyleSelection,
  getThemeStyles,
  installUi,
  installUiTheme,
  UiHydrationError,
  uiTokenStyles,
  visuallyHiddenAttributes,
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
  Breadcrumbs,
  Card,
  ButtonGroup,
  ChoiceGroup,
  ControlField,
  DialogSurface,
  Disclosure,
  ResponsiveDisclosure,
  EmptyState,
  FormField,
  InlineNotice,
  NavigationStrip,
  Pagination,
  Tooltip,
  Stepper,
  FilterBar,
  DataList,
  ListboxField,
  ComboboxField,
  CommandPalette,
  TreeView,
  SortControl,
  DatePicker,
  FileUpload,
  datePickerStyles,
  fileUploadStyles,
  sortControlStyles,
  comboboxFieldStyles,
  commandPaletteStyles,
  listboxFieldStyles,
  treeViewStyles,
  tooltipStyles,
  SegmentedControl,
  TableRegion,
  Tabs,
  createDialogSurfaceController,
  disclosureStyles,
  moleculeManifest,
  moleculeStyles,
} from '@gluonjs/molecules';
import { AdminShell, AppShell, AsyncState, MegaMenu, ProductCard, ProductGallery, ProductGrid, SiteFooter, SiteHeader, adminShellStyles, megaMenuStyles, organismManifest, organismStyles, productGalleryStyles, siteFooterStyles, siteHeaderStyles } from '@gluonjs/organisms';
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
  it('renders the foundation atoms with native semantics, variants, and token-backed presentation', () => {
    render(q.main({ children: [
      Heading({ level: 2, children: 'Catalog' }),
      Text({ tone: 'muted', children: 'Browse the collection.' }),
      Link({ href: '/catalog', children: 'Open catalog' }),
      Image({ src: '/assets/catalog-preview.webp', alt: 'Catalog preview', width: 120, height: 80 }),
      Badge({ tone: 'success', children: 'Available' }),
      Spinner({ label: 'Loading catalog' }),
      Skeleton({ width: '12rem', height: '2rem' }),
      Meter({ value: 72, max: 100, attributes: { id: 'completion', aria: { label: 'Completion' } } }),
      NumberInput({ value: '2', attributes: { id: 'quantity' } }),
      DateInput({ value: '2026-10-02', attributes: { id: 'date' } }),
      TimeInput({ value: '09:30', attributes: { id: 'time' } }),
    ] }), document.body);

    expect(document.querySelector<HTMLElement>('h2.gluon-heading')?.dataset.gluonLevel).toBe('2');
    expect(document.querySelector('.gluon-text.is-muted')).not.toBeNull();
    expect(document.querySelector<HTMLAnchorElement>('.gluon-link')?.href).toContain('/catalog');
    expect(document.querySelector<HTMLImageElement>('.gluon-image')?.alt).toBe('Catalog preview');
    expect(document.querySelector('.gluon-badge.is-success')).not.toBeNull();
    expect(document.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading catalog');
    expect(document.querySelector('.gluon-skeleton')?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('meter.gluon-meter')?.getAttribute('aria-label')).toBe('Completion');
    expect(document.querySelector<HTMLInputElement>('#quantity')?.type).toBe('number');
    expect(document.querySelector<HTMLInputElement>('#date')?.type).toBe('date');
    expect(document.querySelector<HTMLInputElement>('#time')?.type).toBe('time');
  });

  it('covers foundation defaults, optional attributes, and alternate native styles', () => {
    render(q.main({ children: [
      Heading({ children: 'Default heading' }),
      Text({ children: 'Default paragraph' }),
      Link({ children: 'Unlinked text' }),
      Image({ src: '/assets/catalog-preview.webp', alt: 'Preview' }),
      Badge({ children: 'Neutral' }),
      Spinner({}),
      Skeleton({ attributes: { style: { '--gluon-skeleton-width': '4rem' } } }),
      Meter({ value: 1 }),
    ] }), document.body);

    expect(document.querySelector('h2.gluon-heading')).not.toBeNull();
    expect(document.querySelector('.gluon-text')).not.toHaveClass('is-default');
    expect(document.querySelector<HTMLAnchorElement>('.gluon-link')?.hasAttribute('href')).toBe(false);
    expect(document.querySelector<HTMLImageElement>('.gluon-image')?.loading).toBe('lazy');
    expect(document.querySelector('.gluon-badge')?.className).not.toContain('is-neutral');
    expect(document.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading');
    expect(document.querySelector('.gluon-skeleton')?.getAttribute('style')).toContain('--gluon-skeleton-width');
    expect(document.querySelector<HTMLMeterElement>('meter')?.max).toBe(100);
  });

  it('keeps FileInput native and exposes opt-in accessibility utilities', () => {
    render(q.main({ children: [
      FileInput({
        accept: 'image/*',
        capture: 'environment',
        multiple: true,
        name: 'photos',
        required: true,
        invalid: true,
        attributes: { id: 'photos' },
      }),
      q.a({ ...visuallyHiddenAttributes<HTMLAnchorElement>({ href: '#photos', id: 'skip' }), children: 'Skip to photos' }),
      q.button({ ...focusRingAttributes<HTMLButtonElement>({ id: 'focus-target', type: 'button' }), children: 'Focus target' }),
    ] }), document.body);

    const input = document.querySelector<HTMLInputElement>('#photos')!;
    expect(input.type).toBe('file');
    expect(input.accept).toBe('image/*');
    expect(input.getAttribute('capture')).toBe('environment');
    expect(input.multiple).toBe(true);
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.classList).toContain('gluon-file-input');
    expect(document.querySelector('#skip')?.classList).toContain('gluon-visually-hidden');
    expect(document.querySelector('#focus-target')?.classList).toContain('gluon-focus-ring');
    expect(getStyleSheetText(accessibilityStyles)).toContain('forced-colors');
  });

  it('renders AspectRatio with typed native attributes, merged classes, exact styles, and validated geometry', () => {
    render(AspectRatio({
      ratio: 2,
      children: 'Media',
      attributes: {
        id: 'ratio-media',
        class: 'catalog-media',
        title: 'Product media',
        data: { owner: 'catalog' },
        style: { inlineSize: '240px' },
      },
    }), document.body);

    const ratio = document.querySelector<HTMLDivElement>('#ratio-media')!;
    const bounds = ratio.getBoundingClientRect();
    expect(ratio.classList).toContain('gluon-aspect-ratio');
    expect(ratio.classList).toContain('catalog-media');
    expect(ratio.dataset.owner).toBe('catalog');
    expect(ratio.title).toBe('Product media');
    expect(ratio.style.getPropertyValue('--gluon-aspect-ratio')).toBe('2');
    expect(bounds.width).toBeCloseTo(240, 0);
    expect(bounds.height).toBeCloseTo(120, 0);
    expect(document.adoptedStyleSheets).toContain(aspectRatioStyles);

    for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => AspectRatio({ ratio: invalid })).toThrow(
        'AspectRatio ratio must be a positive finite number.',
      );
    }
  });

  it('keeps Avatar loaded, loading, error, and no-src announcements singular and native', async () => {
    const source = '/avatar.svg';
    render(q.div({ children: [
      Avatar({
        src: source,
        alt: 'Ada Lovelace',
        status: 'loaded',
        attributes: { id: 'avatar-loaded-image', class: 'profile-photo', loading: 'lazy' },
      }),
      Avatar({ src: source, alt: 'Lin Chen', fallback: 'LC', status: 'loading' }),
      Avatar({ src: source, alt: 'Sam Rivera', fallback: 'SR', status: 'error' }),
      Avatar({ alt: 'No Source', fallback: 'NS', status: 'loaded' }),
    ] }), document.body);

    const avatars = [...document.querySelectorAll<HTMLElement>('.gluon-avatar')];
    const loaded = avatars[0]!;
    const loadedImage = loaded.querySelector<HTMLImageElement>('img')!;
    expect(loaded.getAttribute('role')).toBeNull();
    expect(loaded.querySelectorAll('img')).toHaveLength(1);
    expect(loaded.querySelector('.gluon-avatar__fallback')).toBeNull();
    expect(loadedImage.alt).toBe('Ada Lovelace');
    expect(loadedImage.classList).toContain('profile-photo');
    expect(loadedImage.loading).toBe('lazy');

    const loading = avatars[1]!;
    const loadingFallback = loading.querySelector<HTMLElement>('[role="img"]')!;
    expect(loading.querySelector('img')).toBeNull();
    expect(loadingFallback.getAttribute('aria-label')).toBe('Lin Chen');
    expect(loadingFallback.getAttribute('aria-busy')).toBe('true');
    expect(loadingFallback.firstElementChild?.getAttribute('aria-hidden')).toBe('true');

    const errorFallback = avatars[2]!.querySelector<HTMLElement>('[role="img"]')!;
    expect(avatars[2]!.querySelector('img')).toBeNull();
    expect(errorFallback.getAttribute('aria-label')).toBe('Sam Rivera');
    expect(errorFallback.hasAttribute('aria-busy')).toBe(false);

    const noSourceFallback = avatars[3]!.querySelector<HTMLElement>('[role="img"]')!;
    expect(avatars[3]!.classList).toContain('is-error');
    expect(avatars[3]!.querySelector('img')).toBeNull();
    expect(noSourceFallback.getAttribute('aria-label')).toBe('No Source');
    expect(document.adoptedStyleSheets).toContain(avatarStyles);
    expect(() => Avatar({ alt: ' ' })).toThrow('Avatar alt must be a non-empty');

    const results = await axe.run(document.body, { runOnly: ['wcag2a', 'wcag2aa'] });
    expect(results.violations).toEqual([]);
  });

  it('keeps ScrollArea a named, bounded, focusable native overflow region', async () => {
    render(q.div({ dir: 'rtl', children: [
      q.button({ children: 'Before' }),
      ScrollArea({
        label: 'Release notes',
        orientation: 'both',
        attributes: {
          id: 'release-notes',
          class: 'release-scroll',
          data: { owner: 'release' },
          style: {
            '--gluon-scroll-area-max-inline-size': '160px',
            '--gluon-scroll-area-max-block-size': '96px',
          },
        },
        children: q.div({
          style: { inlineSize: '420px', blockSize: '360px' },
          children: 'Scrollable release notes',
        }),
      }),
      ScrollArea({
        label: 'Programmatic history',
        attributes: { id: 'programmatic-history', tabIndex: -1, class: 'programmatic' },
        children: q.div({ style: { blockSize: '400px' }, children: 'History' }),
      }),
    ] }), document.body);

    const area = document.querySelector<HTMLElement>('#release-notes')!;
    expect(area.tagName).toBe('SECTION');
    expect(area.getAttribute('role')).toBeNull();
    expect(area.getAttribute('aria-label')).toBe('Release notes');
    expect(area.tabIndex).toBe(0);
    expect(area.classList).toContain('release-scroll');
    expect(area.dataset.owner).toBe('release');
    expect(area.clientWidth).toBeLessThan(area.scrollWidth);
    expect(area.clientHeight).toBeLessThan(area.scrollHeight);
    expect(area.clientWidth).toBeLessThanOrEqual(160);
    expect(area.clientHeight).toBeLessThanOrEqual(96);
    expect(getComputedStyle(area).direction).toBe('rtl');
    expect(getComputedStyle(area).overflowX).toBe('auto');
    expect(getComputedStyle(area).overflowY).toBe('auto');

    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(area);
    expect(getComputedStyle(area).outlineStyle).toBe('solid');
    await userEvent.keyboard('{ArrowDown}');
    await vi.waitFor(() => expect(area.scrollTop).toBeGreaterThan(0));
    area.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    area.scrollTo({ top: 80, left: -80, behavior: 'instant' });
    expect(area.scrollTop).toBeGreaterThan(0);
    expect(Math.abs(area.scrollLeft)).toBeGreaterThan(0);

    const programmatic = document.querySelector<HTMLElement>('#programmatic-history')!;
    expect(programmatic.tabIndex).toBe(-1);
    expect(programmatic.classList).toContain('programmatic');
    expect(document.adoptedStyleSheets).toContain(scrollAreaStyles);
    expect(getStyleSheetText(scrollAreaStyles)).toContain('@media (prefers-reduced-motion: reduce)');
    expect(getStyleSheetText(scrollAreaStyles)).toContain('scroll-behavior: auto !important');
    expect(getStyleSheetText(scrollAreaStyles)).toContain('@media (forced-colors: active)');
    expect(() => ScrollArea({ label: ' ' })).toThrow('ScrollArea label must be a non-empty');
  });

  it('preserves native and decorative Separator semantics with logical, zoom-safe geometry', async () => {
    render(q.div({
      dir: 'rtl',
      style: { inlineSize: '240px', blockSize: '80px', display: 'flex', alignItems: 'stretch' },
      children: [
        Separator({ attributes: { id: 'horizontal-rule', class: 'section-rule' } }),
        Separator({
          orientation: 'vertical',
          attributes: {
            id: 'vertical-rule',
            class: 'column-rule',
            style: { '--gluon-separator-thickness': '2px' },
          },
        }),
        Separator({ decorative: true, attributes: { id: 'decorative-rule' } }),
      ],
    }), document.body);

    const horizontal = document.querySelector<HTMLHRElement>('#horizontal-rule')!;
    const vertical = document.querySelector<HTMLHRElement>('#vertical-rule')!;
    const decorative = document.querySelector<HTMLHRElement>('#decorative-rule')!;
    expect(horizontal.tagName).toBe('HR');
    expect(horizontal.getAttribute('role')).toBeNull();
    expect(horizontal.getAttribute('aria-orientation')).toBeNull();
    expect(horizontal.classList).toContain('section-rule');
    expect(vertical.getAttribute('role')).toBeNull();
    expect(vertical.getAttribute('aria-orientation')).toBe('vertical');
    expect(vertical.classList).toContain('column-rule');
    expect(vertical.getBoundingClientRect().width).toBeCloseTo(2, 0);
    expect(vertical.getBoundingClientRect().height).toBeCloseTo(80, 0);
    expect(decorative.getAttribute('role')).toBe('presentation');
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(vertical).direction).toBe('rtl');
    expect(document.adoptedStyleSheets).toContain(separatorStyles);
    expect(getStyleSheetText(separatorStyles)).toContain('@media (forced-colors: active)');

    document.body.style.zoom = '2';
    expect(vertical.getBoundingClientRect().width).toBeCloseTo(4, 0);
    document.body.style.zoom = '';

    const results = await axe.run(document.body, { runOnly: ['wcag2a', 'wcag2aa'] });
    expect(results.violations).toEqual([]);
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

  it('retains compact disclosure state across parent rerenders and resets only for a new token', async () => {
    let compact = true;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const query = {
      get matches() { return compact; },
      media: '(max-width: 48rem)',
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      dispatchEvent: () => true,
    } as MediaQueryList;
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(query);
    const onToggle = vi.fn();
    const view = (copy: string, resetToken = 0) => ResponsiveDisclosure({
      id: 'responsive-filters',
      summary: 'Filters',
      compactBreakpoint: '(max-width: 48rem)',
      compactResetToken: resetToken,
      onToggle,
      children: q.p({ children: copy }),
    });

    render(view('Initial facets'), document.body);
    const details = document.querySelector<HTMLDetailsElement>('#responsive-filters')!;
    const summary = details.querySelector('summary')!;
    expect(details.open).toBe(false);
    summary.click();
    await vi.waitFor(() => expect(details.open).toBe(true));
    await vi.waitFor(() => expect(onToggle).toHaveBeenCalled());
    render(view('Updated facets'), document.body);
    expect(document.querySelector('#responsive-filters')).toBe(details);
    expect(details.open).toBe(true);
    expect(details.textContent).toContain('Updated facets');
    expect(listeners).toHaveLength(1);

    compact = false;
    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    expect(details.open).toBe(true);
    summary.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(details.open).toBe(true);
    compact = true;
    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    expect(details.open).toBe(true);
    expect(summary.getAttribute('aria-expanded')).toBe('true');

    render(view('Reset facets', 1), document.body);
    expect(document.querySelector('#responsive-filters')).toBe(details);
    expect(details.open).toBe(false);
    expect(summary.getAttribute('aria-expanded')).toBe('false');
    render(q.div({ children: 'replaced' }), document.body);
    expect(listeners).toHaveLength(0);
    matchMedia.mockRestore();
  });

  it('supports initial open states, legacy listeners, native keyboard toggles, refs, and callbacks', async () => {
    let compact = true;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const query = {
      get matches() { return compact; },
      media: '(max-width: 40rem)',
      onchange: null,
      addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(query);
    const externalRef: { value?: HTMLDetailsElement } = {};
    const attributeToggle = { handleEvent: vi.fn() };
    const onToggle = vi.fn();
    render(ResponsiveDisclosure({
      id: 'initially-open-filters',
      summary: 'Filters',
      compactBreakpoint: '(max-width: 40rem)',
      compactInitialOpen: true,
      onToggle,
      attributes: { ref: externalRef, '@toggle': attributeToggle },
      children: 'Filters content',
    }), document.body);
    const details = externalRef.value!;
    const summary = details.querySelector<HTMLElement>('summary')!;
    expect(details.open).toBe(true);
    expect(summary.getAttribute('aria-expanded')).toBe('true');
    summary.focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(details.open).toBe(false));
    await vi.waitFor(() => expect(onToggle).toHaveBeenCalled());
    expect(attributeToggle.handleEvent).toHaveBeenCalled();
    expect(summary.getAttribute('aria-expanded')).toBe('false');
    compact = false;
    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    expect(details.open).toBe(true);
    compact = true;
    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    expect(details.open).toBe(false);
    render(q.div(), document.body);
    expect(externalRef.value).toBeUndefined();
    expect(listeners).toHaveLength(0);
    matchMedia.mockRestore();
  });

  it('fails closed with stable diagnostics for invalid configuration and media-query failures', () => {
    expect(() => ResponsiveDisclosure({ id: '', summary: 'Filters', compactBreakpoint: '(max-width: 40rem)', children: 'Content' }))
      .toThrow(/GLUON_RESPONSIVE_DISCLOSURE_ID_INVALID/);
    expect(() => ResponsiveDisclosure({ id: 'filters', summary: 'Filters', compactBreakpoint: ' ', children: 'Content' }))
      .toThrow(/GLUON_RESPONSIVE_DISCLOSURE_BREAKPOINT_INVALID/);
    expect(() => ResponsiveDisclosure({ id: 'filters', summary: 'Filters', compactBreakpoint: '(max-width: 40rem)', compactInitialOpen: 'yes' as never, children: 'Content' }))
      .toThrow(/GLUON_RESPONSIVE_DISCLOSURE_INITIAL_OPEN_INVALID/);
    expect(() => ResponsiveDisclosure({ id: 'filters', summary: 'Filters', compactBreakpoint: '(max-width: 40rem)', compactResetToken: Number.NaN, children: 'Content' }))
      .toThrow(/GLUON_RESPONSIVE_DISCLOSURE_RESET_TOKEN_INVALID/);

    const matchMedia = vi.spyOn(window, 'matchMedia');
    matchMedia.mockReturnValueOnce({
      matches: false,
      media: 'not all',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList);
    render(ResponsiveDisclosure({ id: 'malformed-query', summary: 'Filters', compactBreakpoint: '(invalid query', compactInitialOpen: false, children: 'Content' }), document.body);
    expect(document.querySelector<HTMLDetailsElement>('#malformed-query')!.dataset.gluonResponsiveDisclosureError)
      .toBe('GLUON_RESPONSIVE_DISCLOSURE_MATCH_MEDIA_FAILED');

    matchMedia.mockReturnValueOnce({
      matches: false,
      media: '(max-width: 40rem)',
      onchange: null,
      dispatchEvent: () => true,
    } as unknown as MediaQueryList);
    render(ResponsiveDisclosure({ id: 'listenerless-query', summary: 'Filters', compactBreakpoint: '(max-width: 40rem)', compactInitialOpen: false, children: 'Content' }), document.body);
    expect(document.querySelector<HTMLDetailsElement>('#listenerless-query')!.dataset.gluonResponsiveDisclosureError)
      .toBe('GLUON_RESPONSIVE_DISCLOSURE_MATCH_MEDIA_FAILED');

    matchMedia.mockImplementation(() => { throw new Error('unavailable'); });
    render(ResponsiveDisclosure({ id: 'failed-query', summary: 'Filters', compactBreakpoint: '(max-width: 40rem)', compactInitialOpen: false, children: 'Content' }), document.body);
    const failed = document.querySelector<HTMLDetailsElement>('#failed-query')!;
    expect(failed.open).toBe(false);
    expect(failed.dataset.gluonResponsiveDisclosureError).toBe('GLUON_RESPONSIVE_DISCLOSURE_MATCH_MEDIA_FAILED');
    expect(failed.querySelector('summary')?.getAttribute('aria-expanded')).toBe('false');
    matchMedia.mockRestore();

    const original = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
    render(ResponsiveDisclosure({ id: 'missing-query', summary: 'Filters', compactBreakpoint: '(max-width: 40rem)', compactInitialOpen: true, children: 'Content' }), document.body);
    const missing = document.querySelector<HTMLDetailsElement>('#missing-query')!;
    expect(missing.open).toBe(true);
    expect(missing.dataset.gluonResponsiveDisclosureError).toBe('GLUON_RESPONSIVE_DISCLOSURE_MATCH_MEDIA_UNAVAILABLE');
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: original });
  });

  it('inherits exact Disclosure RTL, forced-colors, and reduced-motion styles', () => {
    const styles = getStyleSheetText(disclosureStyles);
    expect(styles).toContain('@media (forced-colors: active)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('transition: none');
    expect(styles).toContain('grid-template-columns: minmax(0, 1fr) auto');
    expect(styles).toContain('min-block-size: 44px');
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

  it('isolates tenant-scoped CSS variables, themes, and disposal across one document', () => {
    const acme = document.createElement('section');
    const northwind = document.createElement('section');
    document.body.append(acme, northwind);

    const acmeOwner = installUi(document, {
      tenant: {
        id: 'acme',
        scope: acme,
        theme: 'dark',
        tokens: {
          '--gluon-color-action': '#2457d6',
          '--gluon-radius-control': '0.25rem',
        },
      },
    });
    const northwindOwner = installUi(document, {
      tenant: {
        id: 'northwind',
        scope: northwind,
        theme: 'light',
        tokens: { '--gluon-color-action': '#b42318' },
      },
    });

    expect(acmeOwner.tenantId).toBe('acme');
    expect(acmeOwner.theme).toBe('dark');
    expect(northwindOwner.tenantId).toBe('northwind');
    expect(northwindOwner.theme).toBe('light');
    expect(acme.dataset.gluonTenant).toBe('acme');
    expect(northwind.dataset.gluonTenant).toBe('northwind');
    expect(acme.style.getPropertyValue('--gluon-color-action')).toBe('#2457d6');
    expect(northwind.style.getPropertyValue('--gluon-color-action')).toBe('#b42318');
    expect(acme.style.getPropertyValue('--gluon-color-surface')).toBe('#172220');
    expect(northwind.style.getPropertyValue('--gluon-color-surface')).toBe('#ffffff');

    acmeOwner.setTokens({ '--gluon-color-action': '#163aa0' });
    expect(acme.style.getPropertyValue('--gluon-color-action')).toBe('#163aa0');
    expect(northwind.style.getPropertyValue('--gluon-color-action')).toBe('#b42318');

    acmeOwner.dispose();
    expect(acme.style.getPropertyValue('--gluon-color-action')).toBe('');
    expect(acme.hasAttribute('data-gluon-tenant')).toBe(false);
    expect(northwind.style.getPropertyValue('--gluon-color-action')).toBe('#b42318');
    northwindOwner.dispose();
  });

  it('rejects invalid tenant token names and conflicting scope ownership', () => {
    const scope = document.createElement('section');
    document.body.append(scope);
    expect(() => installUi(document, {
      tenant: {
        id: 'acme',
        scope,
        // @ts-expect-error Invalid custom-property namespace is rejected at runtime.
        tokens: { '--app-color': '#fff' },
      },
    })).toThrow('Invalid Gluon UI token');

    const owner = installUi(document, { tenant: { id: 'acme', scope } });
    expect(() => installUi(document, {
      tenant: { id: 'other', scope, tokens: { '--gluon-color-action': '#000' } },
    })).toThrow('already owned with a different configuration');
    owner.dispose();
  });

  it('validates tenant boundaries, preserves initial scope state, and ref-counts identical owners', () => {
    const scope = document.createElement('section');
    scope.dataset.gluonTheme = 'external';
    scope.dataset.gluonTenant = 'legacy';
    scope.style.setProperty('--gluon-color-action', '#111');
    document.body.append(scope);

    expect(() => installUi(document, { tenant: { id: ' ', scope } })).toThrow('non-empty id');
    expect(() => installUi(document, {
      tenant: { id: 'invalid', scope: document.createElement('section') },
    })).toThrow('belong to the UI style target');
    expect(() => installUi(document, {
      tenant: { id: 'invalid', scope, tokens: { '--gluon-color-action': true as unknown as string } },
    })).toThrow('Invalid value');

    const first = installUi(document, {
      tenant: { id: 'legacy', scope, theme: 'dark', tokens: { '--gluon-color-action': '#222', '--gluon-brand-accent': '#222' } },
    });
    const second = installUi(document, {
      tenant: { id: 'legacy', scope, theme: 'dark', tokens: { '--gluon-color-action': '#222', '--gluon-brand-accent': '#222' } },
    });
    expect(second.tenantId).toBe('legacy');
    first.dispose();
    expect(scope.dataset.gluonTenant).toBe('legacy');
    second.setTokens({ '--gluon-color-action': '#333' });
    expect(scope.style.getPropertyValue('--gluon-brand-accent')).toBe('');
    second.dispose();
    expect(scope.dataset.gluonTheme).toBe('external');
    expect(scope.dataset.gluonTenant).toBe('legacy');
    expect(scope.style.getPropertyValue('--gluon-color-action')).toBe('#111');
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

describe('link-based navigation molecules', () => {
  it('renders breadcrumbs with native links and current-page semantics', () => {
    render(Breadcrumbs({
      label: 'Catalog breadcrumb',
      items: [
        { label: 'Catalog', href: '/catalog' },
        { label: 'Lighting', href: '/catalog/lighting' },
        { label: 'Orbit lamp', current: true },
      ],
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-breadcrumbs')!;
    expect(root.tagName).toBe('NAV');
    expect(root.getAttribute('aria-label')).toBe('Catalog breadcrumb');
    expect(root.querySelectorAll('ol > li')).toHaveLength(3);
    expect(root.querySelectorAll('a')).toHaveLength(2);
    expect(root.querySelector<HTMLAnchorElement>('a')?.href).toContain('/catalog');
    expect(root.querySelector('[aria-current="page"]')?.textContent).toBe('Orbit lamp');
    expect(root.querySelector('[aria-current="page"]')?.tagName).toBe('SPAN');
  });

  it('renders windowed pagination with labeled native destinations', () => {
    render(Pagination({
      currentPage: 4,
      totalPages: 9,
      siblingCount: 1,
      getPageHref: (page) => `/catalog?page=${page}`,
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-pagination')!;
    expect(root.tagName).toBe('NAV');
    expect(root.getAttribute('aria-label')).toBe('Pagination');
    expect(root.querySelector<HTMLAnchorElement>('[aria-label="Previous page"]')?.getAttribute('href')).toBe('/catalog?page=3');
    expect(root.querySelector<HTMLAnchorElement>('[aria-label="Next page"]')?.getAttribute('href')).toBe('/catalog?page=5');
    expect(root.querySelector('[aria-current="page"]')?.textContent).toBe('4');
    expect(root.querySelectorAll('.gluon-pagination-ellipsis')).toHaveLength(2);
    expect(root.querySelector<HTMLAnchorElement>('.is-current')?.getAttribute('aria-label')).toBe('Page 4');
  });

  it('exposes disabled boundary state without inventing a destination', () => {
    render(Pagination({
      currentPage: 1,
      totalPages: 3,
      getPageHref: (page) => `/catalog?page=${page}`,
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-pagination')!;
    const previous = root.querySelector<HTMLElement>('.is-previous .gluon-pagination-link')!;
    expect(previous.tagName).toBe('SPAN');
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector<HTMLAnchorElement>('[aria-label="Next page"]')?.getAttribute('href')).toBe('/catalog?page=2');
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

describe('advanced data and workflow molecules', () => {
  it('renders caller-owned async states with bounded announcements and recovery actions', () => {
    render(AsyncState({
      id: 'recommendations',
      status: 'partial',
      heading: 'Recommendations',
      children: q.ul({ children: q.li({ children: 'Orbit lamp' }) }),
      partialContent: q.p({ children: 'Some recommendations are still loading.' }),
      actions: q.button({ type: 'button', children: 'Retry' }),
    }), document.body);
    const partial = document.querySelector<HTMLElement>('#recommendations')!;
    expect(partial.getAttribute('data-state')).toBe('partial');
    expect(partial.getAttribute('aria-labelledby')).toBe('recommendations-heading');
    expect(partial.querySelector('[role="status"]')?.textContent).toBe('Content partially loaded');
    expect(partial.querySelector('[part="content"]')?.textContent).toContain('Some recommendations');
    expect(partial.querySelector('button')?.textContent).toBe('Retry');

    render(AsyncState({ id: 'recommendations-error', status: 'error', heading: 'Recommendations', errorContent: 'Try again later.' }), document.body);
    const error = document.querySelector<HTMLElement>('#recommendations-error')!;
    expect(error.querySelector('[role="alert"]')?.textContent).toBe('Content failed to load');
    expect(error.querySelector('[part="content"]')?.textContent).toContain('Try again later.');

    render(q.div({ children: [
      AsyncState({ id: 'loading-state', status: 'loading', heading: 'Loading', loadingContent: 'Please wait.' }),
      AsyncState({ id: 'empty-state', status: 'empty', heading: 'Empty', emptyContent: 'Nothing here.' }),
      AsyncState({ id: 'success-state', status: 'success', heading: 'Success', children: 'Ready.' }),
      AsyncState({ id: 'heading-three', status: 'success', heading: 'Three', headingLevel: 3 }),
      AsyncState({ id: 'heading-four', status: 'success', heading: 'Four', headingLevel: 4 }),
      AsyncState({ id: 'heading-five', status: 'success', heading: 'Five', headingLevel: 5 }),
      AsyncState({ id: 'heading-six', status: 'success', heading: 'Six', headingLevel: 6 }),
    ] }), document.body);
    expect(document.querySelector('#loading-state [role="status"]')).not.toBeNull();
    expect(document.querySelector('#empty-state [part="content"]')?.textContent).toContain('Nothing');
    expect(document.querySelector('#success-state [part="content"]')?.textContent).toContain('Ready');
    expect(document.querySelector('#heading-three h3')).not.toBeNull();
    expect(document.querySelector('#heading-four h4')).not.toBeNull();
    expect(document.querySelector('#heading-five h5')).not.toBeNull();
    expect(document.querySelector('#heading-six h6')).not.toBeNull();
  });

  it('renders typed product cards and grids without owning commerce behavior', () => {
    render(ProductGrid({
      items: [
        { id: 'orbit-lamp', title: 'Orbit lamp', description: 'Adjustable light.' },
        { id: 'stack-tray', title: 'Stack tray' },
      ],
      columns: 2,
      renderCard: (product) => ProductCard({ product, href: `/${product.id}`, price: '€128', availability: 'In stock', actions: q.button({ type: 'button', children: 'Add to bag' }) }),
    }), document.body);
    const grid = document.querySelector<HTMLElement>('.gluon-product-grid')!;
    expect(grid.dataset.columns).toBe('2');
    expect(grid.querySelectorAll('.gluon-product-card')).toHaveLength(2);
    expect(grid.querySelector('[data-product-id="orbit-lamp"] h3 a')?.getAttribute('href')).toBe('/orbit-lamp');
    expect(grid.querySelector('[data-product-id="orbit-lamp"] [part="price"]')?.textContent).toBe('€128');
    expect(grid.querySelectorAll('button')).toHaveLength(2);

    render(ProductGrid({ items: [], emptyContent: 'No products found.', attributes: { id: 'empty-products' } }), document.body);
    expect(document.querySelector('#empty-products [part="empty"]')?.textContent).toContain('No products');
  });

  it('renders a source-order-preserving product gallery with image identity and tenant styling hooks', () => {
    render(ProductGallery({
      id: 'orbit-gallery',
      label: 'Orbit Lamp gallery',
      images: [
        { id: 'primary', src: '/orbit.webp', alt: 'Orbit Lamp', primary: true },
        { id: 'detail', src: '/orbit.webp', alt: '', attributes: { class: 'detail-crop', loading: 'lazy' } },
      ],
      attributes: { class: 'tenant-gallery', tabIndex: 0, style: { '--gluon-product-gallery-gap': '1rem' } },
    }), document.body);
    const root = document.querySelector<HTMLElement>('#orbit-gallery')!;
    expect(root.tagName).toBe('SECTION');
    expect(root.classList).toContain('gluon-product-gallery');
    expect(root.classList).toContain('tenant-gallery');
    expect(root.dataset.productGalleryRoot).toBe('orbit-gallery');
    expect(root.getAttribute('aria-label')).toBe('Orbit Lamp gallery');
    expect(root.tabIndex).toBe(0);
    expect([...root.querySelectorAll<HTMLElement>('[data-product-gallery-image]')].map((element) => element.dataset.productGalleryImage))
      .toEqual(['primary', 'detail']);
    expect(root.querySelector('.gluon-product-gallery-primary img')?.getAttribute('alt')).toBe('Orbit Lamp');
    expect(root.querySelector('[data-product-gallery-image="detail"] img')?.getAttribute('alt')).toBe('');
    expect(root.querySelector('[data-product-gallery-image="detail"] img')?.getAttribute('loading')).toBe('lazy');
    expect(root.style.getPropertyValue('--gluon-product-gallery-gap')).toBe('1rem');
    expect(getStyleSheetText(productGalleryStyles)).toContain('--gluon-product-gallery-mobile-item-size');
    expect(getStyleSheetText(productGalleryStyles)).toContain('prefers-reduced-motion');

    render(ProductGallery({
      id: 'fallback-gallery',
      label: 'Fallback gallery',
      images: [{ id: 'fallback', src: '/fallback.webp', alt: 'Fallback media' }],
      attributes: { aria: { label: 'Custom gallery label' } },
    }), document.body);
    expect(document.querySelector('#fallback-gallery')?.getAttribute('aria-label')).toBe('Custom gallery label');
    expect(document.querySelector('#fallback-gallery .gluon-product-gallery-primary')).not.toBeNull();

    expect(() => render(ProductGallery({ id: 'bad gallery', label: 'Gallery', images: [{ id: 'one', src: '/one.webp', alt: '' }] }), document.body)).toThrow('whitespace');
    expect(() => render(ProductGallery({ id: 'duplicate-gallery', label: 'Gallery', images: [{ id: 'one', src: '/one.webp', alt: '' }, { id: 'one', src: '/two.webp', alt: '' }] }), document.body)).toThrow('duplicate');
    expect(() => render(ProductGallery({ id: 'empty-gallery', label: 'Gallery', images: [] as never }), document.body)).toThrow('at least one');
    expect(() => render(ProductGallery({ id: 'empty-label', label: ' ', images: [{ id: 'one', src: '/one.webp', alt: '' }] }), document.body)).toThrow('non-empty');
    expect(() => render(ProductGallery({ id: 'empty-src', label: 'Gallery', images: [{ id: 'one', src: ' ', alt: '' }] }), document.body)).toThrow('src');
    expect(() => render(ProductGallery({ id: 'empty-image-id', label: 'Gallery', images: [{ id: ' ', src: '/one.webp', alt: '' }] }), document.body)).toThrow('non-empty');
    expect(() => render(ProductGallery({ id: 'spaced-image-id', label: 'Gallery', images: [{ id: 'one two', src: '/one.webp', alt: '' }] }), document.body)).toThrow('whitespace');
  });

  it('renders a controlled responsive MegaMenu with grouped links and keyboard focus management', async () => {
    let isOpen = false;
    const changes: boolean[] = [];
    const renderMenu = (): void => render(MegaMenu({
      id: 'shop-menu',
      label: 'Shop navigation',
      trigger: 'Shop',
      open: isOpen,
      groups: [
        { id: 'lighting', label: 'Lighting', description: 'Lights for focused work.', links: [
          { id: 'orbit-lamp', label: 'Orbit lamp', href: '/products/orbit-lamp', description: 'Adjustable light.', active: true },
          { id: 'desk-light', label: 'Desk light', href: '/products/desk-light' },
          { id: 'archived', label: 'Archived', href: '/products/archived', disabled: true },
        ] },
        { id: 'furniture', label: 'Furniture', links: [{ id: 'stack-tray', label: 'Stack tray', href: '/products/stack-tray' }] },
      ],
      onOpenChange: (open) => { changes.push(open); isOpen = open; renderMenu(); },
      attributes: { class: 'shop-menu' },
      triggerAttributes: { class: 'shop-trigger' },
    }), document.body);
    renderMenu();
    const root = document.querySelector<HTMLElement>('#shop-menu')!;
    const trigger = root.querySelector<HTMLButtonElement>('[data-mega-menu-trigger]')!;
    expect(root.tagName).toBe('NAV');
    expect(root.getAttribute('aria-label')).toBe('Shop navigation');
    expect(trigger.getAttribute('aria-controls')).toBe('shop-menu-panel');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelectorAll('.gluon-mega-menu-group')).toHaveLength(2);
    expect(root.querySelectorAll('.gluon-mega-menu-link')).toHaveLength(4);
    expect(root.querySelector('[aria-current="page"]')?.textContent).toContain('Orbit lamp');
    expect(root.querySelector('[aria-disabled="true"]')?.textContent).toContain('Archived');

    await userEvent.click(trigger);
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('shop-menu-link-orbit-lamp'));
    expect(changes).toEqual([true]);
    expect(document.querySelector<HTMLElement>('#shop-menu-panel')?.hidden).toBe(false);
    const first = document.querySelector<HTMLElement>('#shop-menu-link-orbit-lamp')!;
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.id).toBe('shop-menu-link-desk-light');
    await userEvent.keyboard('{End}');
    expect(document.activeElement?.id).toBe('shop-menu-link-stack-tray');
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement?.id).toBe('shop-menu-link-desk-light');
    first.focus();
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(changes).toEqual([true, false]));
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('shop-menu-trigger'));
    expect(getStyleSheetText(megaMenuStyles)).toContain('--gluon-mega-menu');

    render(MegaMenu({ id: 'invalid-menu', label: 'Menu', trigger: 'Open', groups: [{ id: 'group', label: 'Group', links: [] }] }), document.body);
    const invalidTrigger = document.querySelector<HTMLButtonElement>('#invalid-menu-trigger')!;
    invalidTrigger.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(invalidTrigger).toBe(document.activeElement);
    expect(() => render(MegaMenu({ id: 'bad id', label: 'Menu', trigger: 'Open', groups: [] }), document.body)).toThrow('whitespace');
    expect(() => render(MegaMenu({ id: 'duplicate-menu', label: 'Menu', trigger: 'Open', groups: [{ id: 'one', label: 'One', links: [{ id: 'same', label: 'A' }] }, { id: 'two', label: 'Two', links: [{ id: 'same', label: 'B' }] }] }), document.body)).toThrow('unique');
  });

  it('keeps MegaMenu event ownership, disabled links, and empty-state validation explicit', async () => {
    const changes: boolean[] = [];
    const triggerListener = { handleEvent: vi.fn() };
    const linkListener = vi.fn();
    const externalLinkListener = { handleEvent: (event: MouseEvent) => { event.preventDefault(); linkListener(event); } };
    render(MegaMenu({
      id: 'event-menu',
      label: 'Explore the collection',
      trigger: 'Explore',
      open: true,
      groups: [{ id: 'collection', label: 'Collection', links: [
        { id: 'featured', label: 'Featured', href: '/featured', description: 'Latest arrivals.' },
        { id: 'disabled', label: 'Unavailable', disabled: true, attributes: { onClick: linkListener } },
        { id: 'external', label: 'External', href: '/external', attributes: { onClick: externalLinkListener } },
      ] }],
      onOpenChange: (open) => changes.push(open),
      triggerAttributes: { onKeydown: triggerListener },
    }), document.body);
    const root = document.querySelector<HTMLElement>('#event-menu')!;
    const trigger = root.querySelector<HTMLButtonElement>('[data-mega-menu-trigger]')!;
    const panel = root.querySelector<HTMLElement>('.gluon-mega-menu-panel')!;
    const links = root.querySelectorAll<HTMLAnchorElement>('.gluon-mega-menu-link');
    const firstLink = links[0]!;
    const disabledLink = links[1]!;
    const externalLink = links[2]!;

    trigger.focus();
    const arrowDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    trigger.dispatchEvent(arrowDown);
    expect(arrowDown.defaultPrevented).toBe(true);
    expect(triggerListener.handleEvent).toHaveBeenCalledWith(arrowDown);
    await vi.waitFor(() => expect(document.activeElement).toBe(firstLink));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(document.activeElement).toBe(firstLink));
    expect(changes).toEqual([true, true, true, true]);

    firstLink.focus();
    firstLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(externalLink);
    externalLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(firstLink);
    firstLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(firstLink);
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(changes).toEqual([true, true, true, true, false]);
    panel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(changes).toEqual([true, true, true, true, false, false]);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(changes).toEqual([true, true, true, true, false, false, false]);
    disabledLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(linkListener).toHaveBeenCalledTimes(1);
    expect(disabledLink.getAttribute('href')).toBeNull();
    expect(externalLink.getAttribute('href')).toBe('/external');
    externalLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(linkListener).toHaveBeenCalledTimes(2);

    render(MegaMenu({ id: 'href-menu', label: 'Destination menu', trigger: 'Destinations', groups: [{ id: 'group', label: 'Group', links: [{ id: 'no-destination', label: 'No destination' }] }] }), document.body);
    expect(document.querySelector('#href-menu-link-no-destination')?.getAttribute('href')).toBeNull();

    expect(() => render(MegaMenu({ id: '', label: 'Menu', trigger: 'Open', groups: [] }), document.body)).toThrow('non-empty');
    expect(() => render(MegaMenu({ id: 'empty-group', label: 'Menu', trigger: 'Open', groups: [{ id: '', label: 'Group', links: [] }] }), document.body)).toThrow('non-empty');

    render(MegaMenu({ id: 'closed-menu', label: 'Closed menu', trigger: 'Closed', groups: [{ id: 'group', label: 'Group', links: [{ id: 'link', label: 'Link' }] }] }), document.body);
    document.querySelector<HTMLButtonElement>('#closed-menu-trigger')!.focus();
    await userEvent.keyboard('{Escape}');
    const closedPanel = document.querySelector<HTMLElement>('#closed-menu-panel')!;
    closedPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(changes).toEqual([true, true, true, true, false, false, false]);
  });

  it('renders a controlled responsive SiteHeader with semantic regions and mobile focus management', async () => {
    let mobileOpen = false;
    const changes: boolean[] = [];
    const objectKeydown = { handleEvent: vi.fn() };
    const functionKeydown = vi.fn();
    let useFunctionKeydown = false;
    const renderHeader = (): void => render(SiteHeader({
      id: 'shop-header',
      brand: q.a({ href: '/', children: 'GLUON GOODS' }),
      navigation: q.a({ href: '/shop', children: 'Shop' }),
      actions: q.button({ type: 'button', children: 'Search' }),
      mobileNavigation: [q.a({ href: '/shop', children: 'Shop' }), q.a({ href: '/journal', children: 'Journal' })],
      mobileOpen,
      onMobileOpenChange: (open) => { changes.push(open); mobileOpen = open; renderHeader(); },
      triggerAttributes: { onKeydown: useFunctionKeydown ? functionKeydown : objectKeydown },
      attributes: { class: 'commerce-header' },
    }), document.body);
    renderHeader();

    const root = document.querySelector<HTMLElement>('#shop-header')!;
    const trigger = root.querySelector<HTMLButtonElement>('[data-site-header-mobile-trigger]')!;
    expect(root.tagName).toBe('HEADER');
    expect(root.querySelector('.gluon-site-header-brand')?.textContent).toContain('GLUON GOODS');
    expect(root.querySelector('.gluon-site-header-navigation nav, .gluon-site-header-navigation a')?.textContent).toContain('Shop');
    expect(trigger.getAttribute('aria-controls')).toBe('shop-header-mobile-panel');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector<HTMLElement>('#shop-header-mobile-panel')?.hidden).toBe(true);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(objectKeydown.handleEvent).toHaveBeenCalledOnce();
    useFunctionKeydown = true;
    renderHeader();
    document.querySelector<HTMLButtonElement>('[data-site-header-mobile-trigger]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(functionKeydown).toHaveBeenCalledOnce();

    await userEvent.click(document.querySelector<HTMLButtonElement>('[data-site-header-mobile-trigger]')!);
    await vi.waitFor(() => expect(changes).toEqual([true]));
    const openRoot = document.querySelector<HTMLElement>('#shop-header')!;
    const openTrigger = openRoot.querySelector<HTMLButtonElement>('[data-site-header-mobile-trigger]')!;
    const panel = openRoot.querySelector<HTMLElement>('#shop-header-mobile-panel')!;
    expect(openTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(changes).toEqual([true, false]));
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('shop-header-mobile-trigger'));
    expect(getStyleSheetText(siteHeaderStyles)).toContain('--gluon-site-header');

    expect(() => render(SiteHeader({ id: 'bad header', brand: 'Brand' }), document.body)).toThrow('whitespace');
    expect(() => render(SiteHeader({ id: 'empty-label', brand: 'Brand', mobileMenuLabel: ' ' }), document.body)).toThrow('non-empty');
  });

  it('renders a responsive SiteFooter with labelled regions and tenant styling hooks', () => {
    render(SiteFooter({
      id: 'shop-footer',
      brand: q.a({ href: '/', children: 'GLUON GOODS' }),
      navigation: [q.a({ href: '/shop', children: 'Shop' }), q.a({ href: '/journal', children: 'Journal' })],
      legal: q.a({ href: '/privacy', children: 'Privacy' }),
      meta: q.small({ children: 'Objects for focused living.' }),
      navigationLabel: 'Shop footer navigation',
      attributes: { class: 'commerce-footer', style: { '--gluon-site-footer-gap': '2rem' } },
      navigationAttributes: { class: 'footer-links' },
    }), document.body);

    const root = document.querySelector<HTMLElement>('#shop-footer')!;
    expect(root.tagName).toBe('FOOTER');
    expect(root.classList).toContain('gluon-site-footer');
    expect(root.classList).toContain('commerce-footer');
    expect(root.dataset.siteFooterRoot).toBe('shop-footer');
    expect(root.querySelector('.gluon-site-footer-brand a')?.textContent).toBe('GLUON GOODS');
    expect(root.querySelector<HTMLElement>('.gluon-site-footer-navigation')?.getAttribute('aria-label')).toBe('Shop footer navigation');
    expect(root.querySelectorAll('.gluon-site-footer-navigation a')).toHaveLength(2);
    expect(root.querySelector('.gluon-site-footer-legal a')?.getAttribute('href')).toBe('/privacy');
    expect(root.querySelector('.gluon-site-footer-meta')?.textContent).toContain('Objects for focused living.');
    expect(root.style.getPropertyValue('--gluon-site-footer-gap')).toBe('2rem');
    expect(getStyleSheetText(siteFooterStyles)).toContain('--gluon-site-footer');
    expect(getStyleSheetText(siteFooterStyles)).toContain('forced-colors');

    expect(() => render(SiteFooter({ id: 'bad footer' }), document.body)).toThrow('whitespace');
    expect(() => render(SiteFooter({ id: 'empty-label', navigation: 'Links', navigationLabel: ' ' }), document.body)).toThrow('non-empty');
  });

  it('renders a responsive AdminShell with labelled navigation and tenant styling hooks', () => {
    render(AdminShell({
      id: 'admin-shell',
      header: q.strong({ children: 'Back office' }),
      sidebar: [q.a({ href: '/overview', children: 'Overview' }), q.a({ href: '/settings', children: 'Settings' })],
      main: q.h1({ children: 'Workspace' }),
      footer: q.small({ children: 'Tenant: Gluon Goods' }),
      sidebarLabel: 'Back office navigation',
      attributes: { class: 'tenant-admin-shell', style: { '--gluon-admin-shell-sidebar-size': '20rem' } },
    }), document.body);
    const root = document.querySelector<HTMLElement>('#admin-shell')!;
    expect(root.tagName).toBe('DIV');
    expect(root.dataset.adminShellRoot).toBe('admin-shell');
    expect(root.querySelector('.gluon-admin-shell-header strong')?.textContent).toBe('Back office');
    expect(root.querySelector('.gluon-admin-shell-navigation')?.getAttribute('aria-label')).toBe('Back office navigation');
    expect(root.querySelector('.gluon-admin-shell-main h1')?.textContent).toBe('Workspace');
    expect(root.querySelector('.gluon-admin-shell-footer')?.textContent).toContain('Tenant: Gluon Goods');
    expect(root.style.getPropertyValue('--gluon-admin-shell-sidebar-size')).toBe('20rem');
    expect(getStyleSheetText(adminShellStyles)).toContain('--gluon-admin-shell');
    expect(getStyleSheetText(adminShellStyles)).toContain('forced-colors');
    expect(() => render(AdminShell({ id: 'bad shell', main: 'Main' }), document.body)).toThrow('whitespace');
    expect(() => render(AdminShell({ id: 'empty-label', main: 'Main', sidebar: 'Links', sidebarLabel: ' ' }), document.body)).toThrow('non-empty');
  });

  it('renders a keyboard-discoverable tooltip without owning interactive content', () => {
    render(Tooltip({ id: 'delivery-help', content: 'Choose a saved delivery preference.', children: 'Help' }), document.body);
    const root = document.querySelector<HTMLElement>('.gluon-tooltip')!;
    const trigger = root;
    const content = root.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(trigger.tabIndex).toBe(0);
    expect(trigger.getAttribute('aria-describedby')).toBe('delivery-help-content');
    expect(content.id).toBe('delivery-help-content');
    expect(getStyleSheetText(tooltipStyles)).toContain('prefers-reduced-motion');
  });

  it('renders stepper statuses, native destinations, and current-step semantics', () => {
    render(Stepper({
      id: 'checkout-steps',
      label: 'Checkout progress',
      steps: [
        { id: 'configure', label: 'Configure', status: 'complete', href: '/configure' },
        { id: 'review', label: 'Review', status: 'current', description: 'Check the exact order.' },
        { id: 'complete', label: 'Complete', status: 'upcoming' },
      ],
    }), document.body);
    const root = document.querySelector<HTMLElement>('.gluon-stepper')!;
    expect(root.tagName).toBe('NAV');
    expect(root.getAttribute('aria-label')).toBe('Checkout progress');
    expect(root.querySelectorAll('ol > li')).toHaveLength(3);
    expect(root.querySelector<HTMLAnchorElement>('a')?.getAttribute('href')).toBe('/configure');
    expect(root.querySelector('[aria-current="step"]')?.id).toBe('checkout-steps-review');
  });

  it('keeps FilterBar controls and DataList values caller-owned while preserving native semantics', () => {
    render(q.main({ children: [
      FilterBar({
        id: 'catalog-filters',
        label: 'Catalog filters',
        activeCount: 2,
        summary: 'Two filters are active.',
        children: q.label({ children: ['Category', q.select({ children: q.option({ children: 'Lighting' }) })] }),
        clearAction: q.button({ type: 'reset', children: 'Clear filters' }),
      }),
      DataList({
        id: 'order-summary',
        items: [
          { id: 'status', label: 'Status', value: 'Ready', description: 'Available to ship.' },
          { id: 'delivery', label: 'Delivery', value: '2–4 working days' },
        ],
      }),
    ] }), document.body);
    const form = document.querySelector<HTMLFormElement>('#catalog-filters')!;
    expect(form.tagName).toBe('FORM');
    expect(form.getAttribute('aria-label')).toBe('Catalog filters');
    expect(form.querySelector('[role="status"]')?.textContent).toBe('Two filters are active.');
    expect(form.querySelector('button[type="reset"]')).not.toBeNull();
    const list = document.querySelector<HTMLDListElement>('#order-summary')!;
    expect(list.tagName).toBe('DL');
    expect(list.querySelectorAll('dt')).toHaveLength(2);
    expect(list.querySelector<HTMLElement>('dd')?.getAttribute('aria-describedby')).toBe('order-summary-status-description');
  });

  it('composes native DatePicker and FileUpload form fields with tenant token hooks', async () => {
    const dates: string[] = [];
    const files: readonly File[][] = [];
    const selected = [new File(['image'], 'lamp.png', { type: 'image/png' })];
    render(q.main({ children: [
      DatePicker({
        id: 'delivery-date-picker',
        label: 'Delivery date',
        value: '2026-10-06',
        min: '2026-10-03',
        max: '2026-10-31',
        required: true,
        helper: 'Choose a dispatch date.',
        onInput: (value) => dates.push(value),
      }),
      FileUpload({
        id: 'product-photo-upload',
        label: 'Product photos',
        accept: 'image/*',
        files: selected,
        multiple: true,
        error: 'Review the selected files.',
        onChange: (value) => files.push(value),
      }),
    ] }), document.body);

    const dateRoot = document.querySelector<HTMLElement>('#delivery-date-picker')!;
    const dateInput = dateRoot.querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(dateInput.value).toBe('2026-10-06');
    expect(dateInput.min).toBe('2026-10-03');
    expect(dateInput.max).toBe('2026-10-31');
    expect(dateInput.required).toBe(true);
    expect(dateInput.getAttribute('aria-labelledby')).toBe('delivery-date-picker-label');
    expect(dateInput.getAttribute('aria-describedby')).toBe('delivery-date-picker-helper');
    await userEvent.fill(dateInput, '2026-10-07');
    expect(dates.at(-1)).toBe('2026-10-07');

    const uploadRoot = document.querySelector<HTMLElement>('#product-photo-upload')!;
    const uploadInput = uploadRoot.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(uploadInput.multiple).toBe(true);
    expect(uploadInput.accept).toBe('image/*');
    expect(uploadInput.getAttribute('aria-labelledby')).toBe('product-photo-upload-label');
    expect(uploadInput.getAttribute('aria-describedby')).toContain('product-photo-upload-files');
    expect(uploadRoot.querySelector('.gluon-file-upload-files')?.textContent).toContain('lamp.png');
    expect(uploadRoot.querySelector('[role="alert"]')?.textContent).toContain('Review');
    expect(getStyleSheetText(datePickerStyles)).toContain('--gluon-date-picker-gap');
    expect(getStyleSheetText(fileUploadStyles)).toContain('--gluon-file-upload-gap');
  });

  it('renders SortControl with native select semantics and caller-owned changes', async () => {
    const values: string[] = [];
    render(SortControl({
      id: 'catalog-sort-control',
      label: 'Sort products',
      value: 'price-low',
      options: [
        { value: 'featured', label: 'Featured' },
        { value: 'price-low', label: 'Price: low to high' },
        { value: 'oldest', label: 'Oldest first', disabled: true },
      ],
      helper: 'Choose the order for this catalog.',
      onChange: (value) => values.push(value),
      attributes: { style: { '--gluon-sort-control-gap': '1rem' } },
    }), document.body);
    const root = document.querySelector<HTMLElement>('#catalog-sort-control')!;
    const select = root.querySelector<HTMLSelectElement>('select')!;
    expect(select.id).toBe('catalog-sort-control-select');
    expect(select.value).toBe('price-low');
    expect(select.getAttribute('aria-labelledby')).toBe('catalog-sort-control-label');
    expect(select.getAttribute('aria-describedby')).toBe('catalog-sort-control-description');
    expect(select.querySelectorAll('option')).toHaveLength(3);
    expect(select.querySelector<HTMLOptionElement>('option[value="oldest"]')?.disabled).toBe(true);
    await userEvent.selectOptions(select, 'featured');
    expect(values).toEqual(['featured']);
    expect(getStyleSheetText(sortControlStyles)).toContain('--gluon-sort-control-gap');
  });

  it('composes a labelled ListboxField with selection, helper, and error relationships', async () => {
    const values: string[] = [];
    render(ListboxField({
      id: 'delivery-method',
      label: 'Delivery method',
      value: 'standard',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'express', label: 'Express' },
        { value: 'pickup', label: 'Pickup', disabled: true },
      ],
      helper: 'Choose how your order should arrive.',
      onChange: (value) => values.push(value),
    }), document.body);
    const root = document.querySelector<HTMLElement>('#delivery-method')!;
    const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(root.querySelector('.gluon-listbox-field-label')?.textContent).toBe('Delivery method');
    expect(listbox.getAttribute('aria-label')).toBe('Delivery method');
    expect(listbox.getAttribute('aria-describedby')).toBe('delivery-method-description');
    expect(root.querySelectorAll('[role="option"]')).toHaveLength(3);
    expect(root.querySelector('[role="option"][aria-selected="true"]')?.textContent).toBe('Standard');
    const expressOption = root.querySelectorAll<HTMLElement>('[role="option"]')[1];
    expect(expressOption).toBeDefined();
    await userEvent.click(expressOption!);
    expect(values).toEqual(['express']);
    expect(getStyleSheetText(listboxFieldStyles)).toContain('--gluon-listbox-field');

    render(ListboxField({
      id: 'invalid-delivery',
      label: 'Delivery method',
      options: [],
      error: 'Choose a delivery method.',
    }), document.body);
    const invalid = document.querySelector<HTMLElement>('#invalid-delivery')!;
    expect(invalid.querySelector('[role="listbox"]')?.getAttribute('aria-invalid')).toBe('true');
    expect(invalid.querySelector('[role="alert"]')?.textContent).toContain('Choose');
  });

  it('composes a controlled ComboboxField with stable relationships and keyboard selection', async () => {
    const selected: string[] = [];
    const active: string[] = [];
    const openStates: boolean[] = [];
    render(ComboboxField({
      id: 'product-search',
      label: 'Product search',
      value: 'orbit-lamp',
      inputValue: 'Orbit',
      activeValue: 'orbit-lamp',
      open: true,
      options: [
        { value: 'orbit-lamp', label: 'Orbit lamp' },
        { value: 'orbit-cable', label: 'Orbit cable' },
        { value: 'orbit-shade', label: 'Orbit shade', disabled: true },
      ],
      helper: 'Search the current catalog.',
      onSelect: (value) => selected.push(value),
      onActiveChange: (value) => active.push(value),
      onOpenChange: (open) => openStates.push(open),
    }), document.body);
    const root = document.querySelector<HTMLElement>('#product-search')!;
    const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
    const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(input.getAttribute('aria-controls')).toBe('product-search-listbox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('product-search-description');
    expect(listbox.querySelectorAll('[role="option"]')).toHaveLength(3);
    expect(listbox.querySelector('[aria-selected="true"]')?.textContent).toBe('Orbit lamp');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    expect(active).toEqual(['orbit-cable']);
    const expressOption = listbox.querySelectorAll<HTMLElement>('[role="option"]')[1];
    if (!expressOption) throw new Error('Combobox test fixture did not render the express option.');
    await userEvent.click(expressOption);
    expect(selected).toEqual(['orbit-cable']);
    expect(openStates).toEqual([true, false]);
    listbox.querySelectorAll<HTMLElement>('[role="option"]')[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(selected).toEqual(['orbit-cable']);
    expect(getStyleSheetText(comboboxFieldStyles)).toContain('--gluon-combobox-field');

    const keyboardSelected: string[] = [];
    const keyboardActive: string[] = [];
    const inputEvents: string[] = [];
    const keydownEvents: string[] = [];
    render(ComboboxField({
      id: 'keyboard-search',
      label: 'Keyboard search',
      options: [{ value: 'orbit-lamp', label: 'Orbit lamp' }],
      value: 'orbit-lamp',
      activeValue: 'orbit-lamp',
      open: true,
      inputAttributes: {
        onInput: { handleEvent: (event: InputEvent) => inputEvents.push(event.type) },
        onKeydown: { handleEvent: (event: KeyboardEvent) => keydownEvents.push(event.key) },
      },
      onActiveChange: (value) => keyboardActive.push(value),
      onSelect: (value) => keyboardSelected.push(value),
    }), document.body);
    const keyboardInput = document.querySelector<HTMLInputElement>('#keyboard-search [role="combobox"]')!;
    await userEvent.click(keyboardInput);
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{Escape}');
    await userEvent.keyboard('{Enter}');
    await userEvent.fill(keyboardInput, 'Orbit lamp');
    expect(keyboardActive).toEqual([]);
    expect(keyboardSelected).toEqual(['orbit-lamp']);
    expect(inputEvents).toContain('input');
    expect(keydownEvents).toEqual(expect.arrayContaining(['ArrowUp', 'Escape', 'Enter']));

    render(ComboboxField({ id: 'empty-search', label: 'Search', open: true, options: [] }), document.body);
    expect(document.querySelector('#empty-search .gluon-combobox-field-status')?.textContent).toContain('No matches');
    const emptyInput = document.querySelector<HTMLInputElement>('#empty-search [role="combobox"]')!;
    await userEvent.click(emptyInput);
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowUp}');

    render(ComboboxField({
      id: 'prevent-search',
      label: 'Search',
      open: true,
      options: [{ value: 'orbit-lamp', label: 'Orbit lamp' }],
      inputAttributes: {
        onInput: (event) => event.preventDefault(),
        onKeydown: (event) => event.preventDefault(),
      },
    }), document.body);
    const preventedInput = document.querySelector<HTMLInputElement>('#prevent-search [role="combobox"]')!;
    await userEvent.fill(preventedInput, 'Orbit');
    await userEvent.keyboard('{ArrowDown}');

    render(ComboboxField({
      id: 'skip-search',
      label: 'Search',
      open: true,
      activeValue: 'orbit-cable',
      options: [{ value: 'orbit-lamp', label: 'Orbit lamp' }, { value: 'orbit-cable', label: 'Orbit cable' }, { value: 'orbit-shade', label: 'Orbit shade', disabled: true }],
    }), document.body);
    const skipInput = document.querySelector<HTMLInputElement>('#skip-search [role="combobox"]')!;
    await userEvent.click(skipInput);
    await userEvent.keyboard('{ArrowDown}');

    render(ComboboxField({ id: 'loading-search', label: 'Search', open: true, loading: true, options: [] }), document.body);
    expect(document.querySelector('#loading-search [role="status"]')?.textContent).toContain('Loading');
    render(ComboboxField({ id: 'invalid-search', label: 'Search', error: 'Choose a product.', options: [] }), document.body);
    expect(document.querySelector('#invalid-search [role="combobox"]')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('#invalid-search [role="alert"]')?.textContent).toContain('Choose');
    expect(() => render(ComboboxField({ id: '', label: 'Search', options: [] }), document.body)).toThrow('ComboboxField.id');
    expect(() => render(ComboboxField({ id: 'bad id', label: 'Search', options: [] }), document.body)).toThrow('whitespace');
    expect(() => render(ComboboxField({ id: 'missing-label', label: ' ', options: [] }), document.body)).toThrow('ComboboxField.label');
  });

  it('composes a controlled TreeView with hierarchy, selection, expansion, and keyboard navigation', async () => {
    const selected: string[] = [];
    const expanded: string[] = [];
    render(TreeView({
      id: 'catalog-tree',
      label: 'Catalog navigation',
      expanded: ['shop'],
      selected: 'lighting',
      nodes: [
        { id: 'shop', label: 'Shop', children: [
          { id: 'lighting', label: 'Lighting' },
          { id: 'archived', label: 'Archived', disabled: true },
        ] },
        { id: 'settings', label: 'Settings' },
      ],
      attributes: { class: 'catalog-tree' },
      onExpandedChange: (id, value) => expanded.push(`${id}:${value}`),
      onSelect: (id) => selected.push(id),
    }), document.body);
    const root = document.querySelector<HTMLElement>('#catalog-tree')!;
    expect(root.getAttribute('role')).toBe('tree');
    expect(root.getAttribute('aria-label')).toBe('Catalog navigation');
    expect(root.classList).toContain('catalog-tree');
    expect(root.querySelectorAll('[role="treeitem"]')).toHaveLength(4);
    expect(root.querySelector('[role="group"]')).not.toBeNull();
    expect(root.querySelector('[role="treeitem"][aria-selected="true"]')?.getAttribute('data-tree-node')).toBe('lighting');
    expect(root.querySelector('[data-tree-node="archived"]')?.getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector('[data-tree-node="settings"]')?.getAttribute('tabindex')).toBe('-1');
    expect(root.querySelector('[data-tree-node="lighting"]')?.getAttribute('tabindex')).toBe('0');

    await userEvent.click(root.querySelector('[data-tree-node="settings"]')!);
    expect(selected).toEqual(['settings']);
    await userEvent.click(root.querySelector<HTMLButtonElement>('[data-tree-node="shop"] .gluon-tree-view-toggle')!);
    expect(expanded).toEqual(['shop:false']);
    root.querySelector('[data-tree-node="archived"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(selected).toEqual(['settings']);

    const lighting = root.querySelector<HTMLElement>('[data-tree-node="lighting"]')!;
    lighting.focus();
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(root.querySelector('[data-tree-node="shop"]'));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(lighting);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(root.querySelector('[data-tree-node="settings"]'));
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(lighting);
    await userEvent.keyboard('{End}');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(selected).toEqual(['settings', 'settings', 'settings']);

    const shop = root.querySelector<HTMLElement>('[data-tree-node="shop"]')!;
    shop.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(root.querySelector('[data-tree-node="lighting"]'));
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(shop);
    await userEvent.keyboard('{ArrowLeft}');
    expect(expanded).toContain('shop:false');
    expect(getStyleSheetText(treeViewStyles)).toContain('--gluon-tree-view');

    render(TreeView({ id: 'empty-tree', label: 'Empty tree', nodes: [{ id: 'locked', label: 'Locked', disabled: true }] }), document.body);
    expect(document.querySelector('#empty-tree [role="treeitem"]')?.getAttribute('tabindex')).toBe('-1');
    expect(() => render(TreeView({ id: 'bad id', label: 'Tree', nodes: [] }), document.body)).toThrow('whitespace');
    expect(() => render(TreeView({ id: 'missing-label', label: ' ', nodes: [] }), document.body)).toThrow('TreeView.label');
    expect(() => render(TreeView({ id: 'duplicate-tree', label: 'Tree', nodes: [{ id: 'same', label: 'One' }, { id: 'same', label: 'Two' }] }), document.body)).toThrow('unique');
    expect(() => render(TreeView({ id: 'child-tree', label: 'Tree', nodes: [{ id: 'parent', label: 'Parent', children: [{ id: 'bad child', label: 'Child' }] }] }), document.body)).toThrow('whitespace');
  });

  it('composes a controlled CommandPalette with grouped commands and keyboard selection', async () => {
    const active: string[] = [];
    const selected: string[] = [];
    const openStates: boolean[] = [];
    const query: string[] = [];
    let currentActive = 'dashboard';
    const renderPalette = (): void => render(CommandPalette({
      id: 'quick-actions',
      label: 'Quick actions',
      open: true,
      activeId: currentActive,
      groups: [
        { id: 'navigation', label: 'Navigation', commands: [
          { id: 'dashboard', label: 'Open dashboard', description: 'View today’s activity.', shortcut: '⌘K' },
          { id: 'orders', label: 'Search orders', shortcut: '↵' },
          { id: 'disabled', label: 'Disabled action', disabled: true },
        ] },
        { id: 'settings', label: 'Settings', commands: [{ id: 'preferences', label: 'Open preferences' }] },
      ],
      onQueryChange: (value) => query.push(value),
      onActiveChange: (id) => { active.push(id); currentActive = id; renderPalette(); },
      onSelect: (id) => selected.push(id),
      onOpenChange: (open) => openStates.push(open),
      attributes: { class: 'quick-actions' },
      inputAttributes: { class: 'quick-actions-input' },
      listboxAttributes: { class: 'quick-actions-list' },
    }), document.body);
    renderPalette();
    const root = document.querySelector<HTMLElement>('#quick-actions')!;
    const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
    const listbox = root.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(root.getAttribute('role')).toBe('dialog');
    expect(root.getAttribute('aria-labelledby')).toBe('quick-actions-label');
    expect(input.getAttribute('aria-controls')).toBe('quick-actions-listbox');
    expect(input.getAttribute('aria-activedescendant')).toBe('quick-actions-command-dashboard');
    expect(listbox.querySelectorAll('[role="group"]')).toHaveLength(2);
    expect(listbox.querySelectorAll('[role="option"]')).toHaveLength(4);
    expect(listbox.querySelector('[aria-selected="true"]')?.textContent).toContain('Open dashboard');
    expect(listbox.querySelector('[data-missing]')).toBeNull();
    expect(root.classList).toContain('quick-actions');
    expect(input.classList).toContain('quick-actions-input');

    await userEvent.click(input);
    await userEvent.fill(input, 'order');
    await userEvent.keyboard('{ArrowDown}');
    expect(query).toEqual(['order']);
    expect(active).toEqual(['orders']);
    await userEvent.keyboard('{Enter}');
    expect(selected).toEqual(['orders']);
    expect(openStates).toEqual([true, true, false]);

    const disabled = document.querySelector<HTMLButtonElement>('#quick-actions-command-disabled')!;
    disabled.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(selected).toEqual(['orders']);
    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{End}');
    expect(active).toEqual(['orders', 'dashboard', 'preferences']);
    await userEvent.keyboard('{Escape}');
    expect(openStates).toEqual([true, true, false, false]);
    expect(getStyleSheetText(commandPaletteStyles)).toContain('--gluon-command-palette');

    const directSelected: string[] = [];
    render(CommandPalette({ id: 'direct-command', label: 'Direct command', open: true, groups: [{ id: 'actions', label: 'Actions', commands: [{ id: 'save', label: 'Save' }] }], onSelect: (id) => directSelected.push(id) }), document.body);
    await userEvent.click(document.querySelector<HTMLButtonElement>('#direct-command-command-save')!);
    expect(directSelected).toEqual(['save']);

    render(CommandPalette({ id: 'loading-commands', label: 'Commands', open: true, loading: true, groups: [] }), document.body);
    expect(document.querySelector('#loading-commands [role="status"]')?.textContent).toContain('Loading');
    render(CommandPalette({ id: 'empty-commands', label: 'Commands', open: true, groups: [] }), document.body);
    expect(document.querySelector('#empty-commands .gluon-command-palette-status')?.textContent).toContain('No commands');
    const emptyInput = document.querySelector<HTMLInputElement>('#empty-commands [role="combobox"]')!;
    emptyInput.focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{Enter}');
    expect(() => render(CommandPalette({ id: 'bad id', label: 'Commands', groups: [] }), document.body)).toThrow('whitespace');
    expect(() => render(CommandPalette({ id: 'missing-label', label: ' ', groups: [] }), document.body)).toThrow('CommandPalette.label');
    expect(() => render(CommandPalette({ id: 'duplicate-command', label: 'Commands', groups: [{ id: 'one', label: 'One', commands: [{ id: 'same', label: 'One' }] }, { id: 'two', label: 'Two', commands: [{ id: 'same', label: 'Two' }] }] }), document.body)).toThrow('unique');
  });

  it('covers optional states and rejects invalid molecule identifiers', () => {
    render(Tooltip({
      id: 'disabled-help',
      content: 'Unavailable help',
      children: 'Help',
      placement: 'inline-end',
      disabled: true,
      attributes: { class: 'custom-tooltip' },
    }), document.body);
    const disabledTooltip = document.querySelector<HTMLElement>('#disabled-help')!;
    expect(disabledTooltip.tabIndex).toBe(-1);
    expect(disabledTooltip.querySelector('[role="tooltip"]')).toBeNull();
    expect(disabledTooltip.classList).toContain('custom-tooltip');

    render(Stepper({
      id: 'account-steps',
      label: 'Account setup',
      attributes: { class: 'custom-stepper' },
      steps: [
        { id: 'details', label: 'Details' },
        { id: 'review', label: 'Review', status: 'disabled', href: '/review', content: 'Locked until details are saved.' },
      ],
    }), document.body);
    const stepper = document.querySelector<HTMLElement>('#account-steps')!;
    expect(stepper.classList).toContain('custom-stepper');
    expect(stepper.querySelector('[aria-current="step"]')?.id).toBe('account-steps-details');
    expect(stepper.querySelector('#account-steps-review a')).toBeNull();
    expect(stepper.querySelector('#account-steps-review .gluon-stepper-content')?.textContent).toContain('Locked');

    render(FilterBar({ id: 'empty-filters', label: 'Empty filters', children: 'No filters', activeCount: -1 }), document.body);
    expect(document.querySelector('#empty-filters .gluon-filter-bar-count')?.textContent).toBe('0 active filters');
    render(FilterBar({ id: 'one-filter', label: 'One filter', children: 'One filter', activeCount: 1 }), document.body);
    expect(document.querySelector('#one-filter .gluon-filter-bar-count')?.textContent).toBe('1 active filter');
    render(FilterBar({ id: 'no-count', label: 'No count', children: 'No count' }), document.body);
    expect(document.querySelector('#no-count .gluon-filter-bar-count')).toBeNull();

    render(DataList({ id: 'single-column', columns: 1, items: [{ id: 'owner', label: 'Owner', value: 'Ada' }] }), document.body);
    expect(document.querySelector('#single-column')?.classList).toContain('is-1-columns');
    render(SortControl({ id: 'compact-sort', label: 'Sort', options: [{ value: 'featured', label: 'Featured' }], disabled: true, error: 'Sorting is unavailable.' }), document.body);
    expect(document.querySelector<HTMLSelectElement>('#compact-sort-select')?.disabled).toBe(true);
    expect(document.querySelector('#compact-sort-select')?.getAttribute('aria-invalid')).toBe('true');

    expect(() => Tooltip({ id: 'bad id', content: 'x', children: 'x' })).toThrow(/Tooltip.id/);
    expect(() => Tooltip({ id: '', content: 'x', children: 'x' })).toThrow(/Tooltip.id/);
    expect(() => Stepper({ id: 'bad-stepper', label: ' ', steps: [] })).toThrow(/Stepper.label/);
    expect(() => Stepper({ id: 'empty-stepper', label: 'Steps', steps: [] })).toThrow(/Stepper.steps/);
    expect(() => Stepper({ id: 'duplicate-steps', label: 'Steps', steps: [{ id: 'same', label: 'A' }, { id: 'same', label: 'B' }] })).toThrow(/unique/);
    expect(() => FilterBar({ id: 'bad id', label: 'Filters', children: 'x' })).toThrow(/FilterBar.id/);
    expect(() => FilterBar({ id: 'valid-id', label: ' ', children: 'x' })).toThrow(/FilterBar.label/);
    expect(() => DataList({ id: 'duplicate-data', items: [{ id: 'same', label: 'A', value: '1' }, { id: 'same', label: 'B', value: '2' }] })).toThrow(/unique/);
    expect(() => DataList({ id: 'invalid-data', items: [{ id: 'bad id', label: 'A', value: '1' }] })).toThrow(/DataList item ids/);
    expect(() => SortControl({ id: 'bad sort id', label: 'Sort', options: [] })).toThrow(/SortControl.id/);
    expect(() => SortControl({ id: 'missing-sort-label', label: ' ', options: [] })).toThrow(/SortControl.label/);
    expect(() => SortControl({ id: 'duplicate-sort', label: 'Sort', options: [{ value: 'same', label: 'A' }, { value: 'same', label: 'B' }] })).toThrow(/unique/);
  });
});

function formatViolations(violations: readonly Result[]): string {
  return violations.map((violation) => [
    `${violation.id}: ${violation.help}`,
    ...violation.nodes.map((node) => `${node.target.join(' ')} — ${node.failureSummary ?? 'failed'}`),
  ].join('\n')).join('\n');
}
