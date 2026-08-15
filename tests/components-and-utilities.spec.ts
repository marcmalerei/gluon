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
} from '../src/index.js';
import { ref } from '@gluonjs/reactivity';
import { Button, Icon } from '@gluonjs/atoms';
import { Card, FormField } from '@gluonjs/molecules';
import { AppShell, WorkflowTimeline, type WorkflowTimelineProps } from '@gluonjs/organisms';
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
    expect(root.querySelector('.gluon-app-shell-header')).toBeNull();
    expect(root.querySelector('.gluon-app-shell-navigation')).toBeNull();
    expect(root.querySelector('.gluon-app-shell-footer')).toBeNull();
    expect(unnamed.displayName).toBe('AnonymousComponent');
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
