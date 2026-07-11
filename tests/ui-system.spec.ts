import { beforeEach, describe, expect, it, vi } from 'vitest';
import axe, { type Result } from 'axe-core';
import {
  Button,
  Icon,
  Input,
  atomManifest,
  atomStyles,
  getThemeStyles,
  installUiTheme,
  uiTokenStyles,
} from '@gluonjs/atoms';
import {
  adoptStyles,
  foundationStyles,
  getStyleSheetText,
  layerOrderStyles,
  render,
  unadoptStyles,
} from '../src/index.js';
import { Card, FormField, moleculeManifest, moleculeStyles } from '@gluonjs/molecules';
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

it('keeps the stable composed UI surface free of automated WCAG A/AA violations', async () => {
  adoptStyles(document, layerOrderStyles, foundationStyles, atomStyles, moleculeStyles, organismStyles);
  installUiTheme(document, 'light');
  render(AppShell({
    header: q.h1({ children: 'Account settings' }),
    navigation: q.a({ href: '#profile', children: 'Profile' }),
    children: Card({
      title: 'Profile',
      subtitle: 'Visible account details',
      actions: Button({ label: 'Save profile' }),
      children: [
        FormField({ label: 'Name', value: 'Ada', helper: 'Shown on receipts' }),
        FormField({ label: 'Email', value: 'invalid', error: 'Enter a valid email address' }),
        q.p({ children: [Icon({ name: 'spark', label: 'Verified' }), ' Verified account'] }),
        Input({ attributes: { 'aria-label': 'Search settings' } }),
      ],
    }),
    footer: 'Privacy controls',
  }), document.body);

  const results = await axe.run(document, {
    resultTypes: ['violations'],
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
  });
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});

function formatViolations(violations: readonly Result[]): string {
  return violations.map((violation) => [
    `${violation.id}: ${violation.help}`,
    ...violation.nodes.map((node) => `${node.target.join(' ')} — ${node.failureSummary ?? 'failed'}`),
  ].join('\n')).join('\n');
}
