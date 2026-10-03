import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adoptStyles,
  Suspense,
  createStyleSheet,
  css,
  compose,
  defineAtom,
  elementRef,
  html,
  installGluonStyles,
  mergeProps,
  model,
  repeat,
  render,
  unmount,
} from '../src/index.js';
import { ref } from '@gluonjs/reactivity';
import { Button, Icon } from '@gluonjs/atoms';
import { Card, FormField, Popover, Sheet } from '@gluonjs/molecules';
import { AppShell, PageLayout, SplitPane, WorkflowTimeline, type WorkflowTimelineProps } from '@gluonjs/organisms';
import { fragment, q, quark } from '@gluonjs/quarks';

describe('component variants and utilities', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.adoptedStyleSheets = [];
    vi.unstubAllGlobals();
  });

  it('merges class aliases and object styles while preserving scalar overrides', () => {
    expect(mergeProps({
      className: 'base',
      style: { color: 'red', padding: '4px' },
    }, {
      class: { active: true },
      style: { color: 'blue' },
    })).toEqual({
      class: ['base', { active: true }],
      style: { color: 'blue', padding: '4px' },
    });

    expect(mergeProps({ class: 'base', style: { color: 'red' } })).toEqual({
      class: ['base', undefined],
      style: { color: 'red' },
    });
    expect(mergeProps({ style: { color: 'red' } }, { style: 'display: block' }).style)
      .toBe('display: block');
  });

  it('installs interpolated constructable stylesheets and reports unsupported targets', () => {
    const sheet = css`:root { --space: ${4}px; }`;
    expect(sheet.cssRules[0]?.cssText).toContain('--space: 4px');

    const uninstall = installGluonStyles();
    expect(document.adoptedStyleSheets).toHaveLength(2);
    uninstall();
    expect(document.adoptedStyleSheets).toHaveLength(0);

    expect(() => adoptStyles({} as ShadowRoot, sheet)).toThrow(/adoptedStyleSheets support/i);

    vi.stubGlobal('CSSStyleSheet', undefined);
    expect(() => createStyleSheet(':root {}')).toThrow(/constructable CSSStyleSheet support/i);
  });

  it('renders icon, component, and optional composition variants', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    const unnamed = defineAtom(() => html`<span>anonymous</span>`);

    render(fragment([
      Icon({ name: 'trend-up', size: 16, label: 'Rising' }),
      Icon({ name: 'trend-down' }),
      Icon({ name: 'alert', label: 'Alert' }),
      Button({
        children: q.strong({ children: 'Continue' }),
        label: 'Ignored',
        variant: 'secondary',
        size: 'large',
        disabled: true,
        onClick: click,
        attributes: { class: 'custom-button' },
      }),
      Card({}),
      Card({
        subtitle: 'Details',
        tone: 'warning',
        actions: false,
        media: q.img({ alt: 'Preview', src: 'preview.png' }),
        children: 0,
      }),
      FormField({ label: 'Name' }),
      AppShell({ children: q.p({ children: 'Content' }) }),
      PageLayout({
        id: 'settings-page',
        title: 'Settings',
        breadcrumbs: q.nav({ 'aria-label': 'Breadcrumb', children: 'Account / Settings' }),
        actions: q.button({ type: 'button', children: 'Save' }),
        aside: q.p({ children: 'Help' }),
        footer: q.small({ children: 'Last updated today' }),
        children: q.p({ children: 'Preferences' }),
      }),
      SplitPane({
        id: 'settings-split',
        primary: q.p({ children: 'Editor' }),
        secondary: q.p({ children: 'Inspector' }),
        secondaryLabel: 'Settings inspector',
        secondaryCollapsed: false,
        attributes: { style: { '--gluon-split-pane-secondary-size': '18rem' } },
      }),
      unnamed({}),
    ]), root);

    const icons = [...root.querySelectorAll('.gluon-icon')];
    expect(icons).toHaveLength(3);
    expect(icons[0]?.getAttribute('width')).toBe('16');
    expect(icons[0]?.getAttribute('role')).toBe('img');
    expect(icons[1]?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.custom-button strong')?.textContent).toBe('Continue');
    expect((root.querySelector('.gluon-button') as HTMLButtonElement).disabled).toBe(true);
    expect(root.querySelector('.is-warning')).not.toBeNull();
    expect(root.querySelector('.gluon-card-media img')).not.toBeNull();
    expect(root.querySelector('.gluon-card-body')?.textContent).toBe('0');
    expect(root.querySelector('.gluon-form-helper')).toBeNull();
    expect(root.querySelector('.gluon-split-pane-primary')?.getAttribute('aria-label')).toBe('Primary panel');
    expect(root.querySelector('.gluon-split-pane-secondary')?.getAttribute('aria-label')).toBe('Settings inspector');
    expect(root.querySelector('.gluon-split-pane-toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.gluon-app-shell-header')).toBeNull();
    expect(root.querySelector('.gluon-app-shell-navigation')).toBeNull();
    expect(root.querySelector('.gluon-app-shell-footer')).toBeNull();
    expect(root.querySelector('.gluon-page-layout h1')?.textContent).toBe('Settings');
    expect(root.querySelector('.gluon-page-layout-main')?.getAttribute('aria-labelledby')).toBe('settings-page-title');
    expect(root.querySelector('.gluon-page-layout-aside')?.getAttribute('aria-label')).toBe('Related content');
    expect(root.querySelector('.gluon-page-layout-footer')).not.toBeNull();
    expect(unnamed.displayName).toBe('AnonymousComponent');
  });

  it('supports split pane orientation, controlled collapse, and stable region identifiers', () => {
    const root = document.createElement('div');
    const onSecondaryCollapsedChange = vi.fn();
    render(SplitPane({
      id: 'workspace-pane',
      primary: 'Workspace',
      secondary: 'Inspector',
      orientation: 'vertical',
      secondaryCollapsed: true,
      onSecondaryCollapsedChange,
    }), root);
    const pane = root.querySelector('.gluon-split-pane');
    expect(pane?.getAttribute('data-orientation')).toBe('vertical');
    expect(root.querySelector('.gluon-split-pane-secondary-content')?.hasAttribute('hidden')).toBe(true);
    const toggle = root.querySelector<HTMLButtonElement>('#workspace-pane-toggle');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    toggle?.click();
    expect(onSecondaryCollapsedChange).toHaveBeenCalledWith(false, expect.any(MouseEvent));
    expect(() => render(SplitPane({ id: 'bad pane', primary: 'Primary' }), root)).toThrow(/whitespace/);
    expect(() => render(SplitPane({ id: 'bad-label', primary: 'Primary', secondary: 'Secondary', secondaryLabel: ' ' }), root)).toThrow(/non-empty/);
  });

  it('renders controlled Popover semantics and exposes dismissal callbacks', () => {
    const root = document.createElement('div');
    const onOpenChange = vi.fn();
    const externalRef: { value?: HTMLDivElement } = {};
    render(Popover({
      id: 'finish-help',
      label: 'Finish help',
      trigger: (attributes) => q.button({ ...attributes, children: 'Help' }),
      children: q.p({ children: 'Choose a saved finish.' }),
      placement: 'inline-end',
      onOpenChange,
    }), root);
    const trigger = root.querySelector<HTMLButtonElement>('#finish-help-trigger');
    expect(trigger?.getAttribute('aria-controls')).toBe('finish-help-content');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[role="dialog"]')?.hasAttribute('hidden')).toBe(true);
    trigger?.click();
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.any(MouseEvent));

    render(Popover({
      id: 'finish-help',
      label: 'Finish help',
      open: true,
      trigger: (attributes) => q.button({ ...attributes, children: 'Help' }),
      children: q.p({ children: 'Choose a saved finish.' }),
      attributes: { ref: externalRef },
      onOpenChange,
    }), root);
    expect(externalRef.value).toBe(root.querySelector('.gluon-popover'));
    expect(root.querySelector('[role="dialog"]')?.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Finish help');
    root.querySelector<HTMLDivElement>('[role="dialog"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.any(KeyboardEvent));
    root.querySelector<HTMLElement>('.gluon-popover')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    render(Popover({
      id: 'finish-help',
      label: 'Finish help',
      open: true,
      trigger: (attributes) => q.button({ ...attributes, children: 'Help' }),
      children: q.p({ children: 'Choose a saved finish.' }),
      onOpenChange,
    }), root);
    root.querySelector<HTMLDivElement>('[role="dialog"]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('#finish-help-trigger')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    root.querySelector<HTMLButtonElement>('#finish-help-trigger')?.click();
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    render(Popover({ id: 'closed-help', label: 'Closed help', trigger: (attributes) => q.button({ ...attributes, children: 'Help' }), children: 'Closed content' }), root);
    root.querySelector<HTMLButtonElement>('#closed-help-trigger')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(() => render(Popover({ id: 'bad id', label: 'Bad', trigger: () => 'Help', children: 'Content' }), root)).toThrow(/DOM id/);
    expect(() => render(Popover({ id: 'empty-label', label: ' ', trigger: () => 'Help', children: 'Content' }), root)).toThrow(/non-empty/);
    expect(() => render(Popover({ id: 'bad-label-ref', labelledBy: 'bad ref', trigger: () => 'Help', children: 'Content' }), root)).toThrow(/DOM id/);
    expect(() => render(Popover({ id: 'bad-placement', label: 'Bad placement', placement: 'diagonal' as never, trigger: () => 'Help', children: 'Content' }), root)).toThrow(/placement/);
  });

  it('renders responsive Sheet regions with labelled dialog semantics', () => {
    const root = document.createElement('div');
    const onOpenChange = vi.fn();
    render(Sheet({
      id: 'filters-sheet',
      label: 'Filters',
      open: true,
      placement: 'inline-start',
      title: 'Filter products',
      description: 'Narrow the product list.',
      children: q.p({ children: 'Filter controls' }),
      closeAction: q.button({ type: 'button', children: 'Close' }),
      footer: q.button({ type: 'button', children: 'Apply filters' }),
      onOpenChange,
    }), root);
    const sheet = root.querySelector<HTMLElement>('.gluon-sheet');
    expect(root.querySelector('.gluon-sheet-overlay')?.getAttribute('data-placement')).toBe('inline-start');
    expect(sheet?.getAttribute('role')).toBe('dialog');
    expect(sheet?.getAttribute('aria-label')).toBe('Filters');
    expect(root.querySelector('.gluon-sheet-title')?.textContent).toBe('Filter products');
    expect(root.querySelector('.gluon-sheet-description')?.id).toBe('filters-sheet-description');
    sheet?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.any(Event));
    render(Sheet({ id: 'filters-sheet', label: 'Filters', open: false, dismissOnOverlay: false, children: 'Closed content', onOpenChange }), root);
    render(Sheet({ id: 'no-callback-sheet', label: 'No callback', children: 'Closed content' }), root);
    unmount(root);
    expect(() => render(Sheet({ id: 'bad id', label: 'Bad', children: 'Content' }), root)).toThrow(/DOM id/);
  });

  it('renders WorkflowTimeline as one accessible ordered list across workflow states', () => {
    const root = document.createElement('div');
    render(WorkflowTimeline({
      id: 'operations-workflow',
      state: 'degraded',
      role: 'Operations',
      evidence: 'Import log 42',
      nextAction: q.button({ children: 'Retry' }),
      steps: [
        { id: 'a', label: 'Received', status: 'completed', evidence: 'Receipt' },
        { id: 'b', label: 'Review', status: 'current', role: 'Reviewer' },
        { id: 'c', label: 'Approval', status: 'blocked' },
        { id: 'd', label: 'Delivery', status: 'pending' },
        { id: 'e', label: 'Archived', status: 'skipped' },
      ],
    }), root);
    expect(root.querySelectorAll('ol > li')).toHaveLength(5);
    expect(root.querySelector('[aria-current="step"]')?.textContent).toContain('Review');
    expect(root.textContent).toContain('Next action:');
    expect(root.textContent).toContain('Responsible role: Operations');
    expect(root.textContent).toContain('Last evidence: Import log 42');
    expect(root.querySelector('.gluon-workflow-timeline')).not.toBeNull();
  });

  it('supports every PageLayout heading level and validates stable region identifiers', () => {
    const root = document.createElement('div');
    const levels = [1, 2, 3, 4, 5, 6] as const;

    render(fragment(levels.map((level) => PageLayout({
      id: `level-${level}`,
      title: `Level ${level}`,
      headingLevel: level,
      children: q.p({ children: `Content ${level}` }),
    }))), root);

    for (const level of levels) {
      expect(root.querySelector(`.gluon-page-layout h${level}`)?.textContent).toBe(`Level ${level}`);
    }

    expect(() => PageLayout({ id: '', title: 'Invalid', children: 'Content' })).toThrow(TypeError);
    expect(() => PageLayout({ id: 'invalid id', title: 'Invalid', children: 'Content' })).toThrow(TypeError);
    expect(() => PageLayout({
      id: 'invalid-aside-label',
      title: 'Invalid',
      asideLabel: ' ',
      children: 'Content',
    })).toThrow(TypeError);
  });

  it('localizes status messages and creates safe unique relationships', () => {
    const root = document.createElement('div');
    render(WorkflowTimeline({
      id: 'localized-workflow',
      messages: {
        timeline: 'Ablauf',
        status: (status) => `Status ${status}`,
        step: (position, total) => `Schritt ${position} von ${total}`,
        evidence: 'Nachweis',
      },
      steps: [
        { id: 'a/b', label: 'Erster', status: 'completed', description: 'Beschreibung' },
        { id: 'a b', label: 'Zweiter', status: 'current' },
      ],
    }), root);
    const steps = [...root.querySelectorAll('ol > li')];
    expect(new Set(steps.map((step) => step.id)).size).toBe(2);
    expect(steps[0]?.id).toMatch(/^localized-workflow-step-a-b/);
    expect(steps[1]?.id).toMatch(/^localized-workflow-step-a-b-/);
    expect(steps[0]?.getAttribute('aria-labelledby')).toBe(steps[0]?.querySelector('[id]')?.id);
    expect(root.textContent).toContain('Status completed');
    expect(root.textContent).toContain('Schritt 2 von 2');
    expect(root.textContent).not.toContain('Evidence:');
    expect(root.querySelector('[data-state="current"]')?.getAttribute('part')).toContain('step-current');
  });

  it('fails closed for duplicate IDs, multiple current steps, and inconsistent overall state', () => {
    const root = document.createElement('div');
    render(WorkflowTimeline({ id: 'invalid-workflow', state: 'complete', steps: [
      { id: 'same', label: 'One', status: 'current' },
      { id: 'same', label: 'Two', status: 'current' },
    ], messages: { invalid: 'Ungültiger Ablauf' } }), root);
    expect(root.querySelector('[data-state="invalid"]')).not.toBeNull();
    expect(root.querySelector('ol')).toBeNull();
    expect(root.textContent).toContain('Ungültiger Ablauf');
    const invalidCases: WorkflowTimelineProps[] = [
      { id: 'invalid id', steps: [] },
      { id: 'invalid-status', steps: [{ id: 'one', label: 'One', status: 'unknown' as never }] },
      { id: 'invalid-step-id', steps: [{ id: ' ', label: 'One', status: 'pending' }] },
      { id: 'invalid-step-label', steps: [{ id: 'one', label: ' ', status: 'pending' }] },
      { id: 'multiple-current', steps: [{ id: 'one', label: 'One', status: 'current' }, { id: 'two', label: 'Two', status: 'current' }] },
      { id: 'nonempty-empty', state: 'empty', steps: [{ id: 'one', label: 'One', status: 'pending' }] },
      { id: 'unknown-overall', state: 'unknown' as never, steps: [] },
      { id: 'empty-active', state: 'active', steps: [] },
      { id: 'blocked-active', state: 'active', steps: [{ id: 'one', label: 'One', status: 'blocked' }] },
      { id: 'finished-active', state: 'active', steps: [{ id: 'one', label: 'One', status: 'completed' }] },
      { id: 'empty-complete', state: 'complete', steps: [] },
      { id: 'pending-complete', state: 'complete', steps: [{ id: 'one', label: 'One', status: 'pending' }] },
      { id: 'unblocked-blocked', state: 'blocked', steps: [{ id: 'one', label: 'One', status: 'pending' }] },
    ];
    for (const invalid of invalidCases) {
      const target = document.createElement('div');
      render(WorkflowTimeline(invalid), target);
      expect(target.querySelector('[data-state="invalid"]'), invalid.id).not.toBeNull();
      expect(target.querySelector('ol'), invalid.id).toBeNull();
    }
  });

  it('derives active, blocked, and complete states without duplicate root relationships', () => {
    const root = document.createElement('div');
    render(q.div({ children: [
      WorkflowTimeline({ id: 'first-workflow', steps: [{ id: 'review', label: 'Review', status: 'current' }] }),
      WorkflowTimeline({ id: 'second-workflow', steps: [{ id: 'review', label: 'Review', status: 'pending' }] }),
      WorkflowTimeline({ id: 'blocked-workflow', steps: [{ id: 'review', label: 'Review', status: 'blocked' }] }),
      WorkflowTimeline({ id: 'complete-workflow', steps: [{ id: 'review', label: 'Review', status: 'completed' }] }),
    ] }), root);
    expect(root.querySelector('#first-workflow')?.getAttribute('data-state')).toBe('active');
    expect(root.querySelector('#second-workflow')?.getAttribute('data-state')).toBe('active');
    expect(root.querySelector('#blocked-workflow')?.getAttribute('data-state')).toBe('blocked');
    expect(root.querySelector('#complete-workflow')?.getAttribute('data-state')).toBe('complete');
    const ids = [...root.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(root.textContent).toContain('Current');
    expect(root.textContent).toContain('Pending');
  });

  it('composes typed functional components with an HTML template body and no host boundary', () => {
    const root = document.createElement('div');
    const direct = AppShell({
      header: 'GLUON GOODS',
      children: Card({ title: 'Checkout', children: html`<button>Pay</button>` }),
    });
    const composed = compose(AppShell, { header: 'GLUON GOODS' })`${compose(Card, { title: 'Checkout' })`<button>Pay</button>`}`;

    render(html`<section id="direct">${direct}</section><section id="composed">${composed}</section>`, root);

    expect(root.querySelector('#composed')?.textContent).toBe(root.querySelector('#direct')?.textContent);
    expect(root.querySelector('#composed')?.querySelectorAll('.gluon-app-shell')).toHaveLength(1);
    expect(root.querySelector('#composed')?.querySelectorAll('.gluon-card')).toHaveLength(1);
  });

  it('keeps named/scoped content, callbacks, spreads, models, refs, conditions, keys, and async bodies on public contracts', async () => {
    const input = ref('Ada');
    const inputRef = elementRef<HTMLInputElement>();
    const save = vi.fn();
    const Panel = (props: {
      readonly actions: import('../src/index.js').TemplateValue;
      readonly row: import('../src/index.js').ScopedSlot<{ label: string }>;
      readonly children: import('../src/index.js').TemplateValue;
    }) => html`<section>${props.children}${props.row({ label: 'Scoped' })}${props.actions}</section>`;
    const view = compose(Panel, {
      actions: html`<button @click=${save}>Save</button>`,
      row: ({ label }) => html`<strong>${label}</strong>`,
    })`
      <input ...=${{ ...model(input), ref: inputRef }}>
      ${true ? html`<span>Conditional</span>` : null}
      ${repeat([{ id: 'one', label: 'Keyed' }], (item) => item.id, (item) => html`<i>${item.label}</i>`)}
      ${Suspense({ source: Promise.resolve('Async'), fallback: 'Loading', children: (value) => html`<em>${value}</em>` })}
    `;
    const root = document.createElement('div');
    render(html`${view}`, root);
    expect(inputRef.value?.value).toBe('Ada');
    expect(root.textContent).toContain('Conditional');
    expect(root.textContent).toContain('Keyed');
    expect(root.textContent).toContain('ScopedSave');
    root.querySelector<HTMLButtonElement>('button')?.click();
    expect(save).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(root.querySelector('em')?.textContent).toBe('Async'));
  });

  it('validates quark names and caches fragment templates', () => {
    const root = document.createElement('div');

    expect(() => quark('Invalid Tag')).toThrow(/invalid quark tag name/i);
    render(fragment('first'), root);
    const text = root.firstChild;
    render(fragment('second'), root);
    expect(root.firstChild).toBe(text);
    expect(root.textContent).toBe('second');
    expect((q as unknown as { toJSON?: unknown }).toJSON).toBeUndefined();
  });
});
