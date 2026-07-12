import { beforeEach, describe, expect, it, vi } from 'vitest';
import axe, { type Result } from 'axe-core';
import {
  Button,
  Icon,
  Input,
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
  unadoptStyles,
} from '../src/index.js';
import { createStyleManifest, renderStyleCarriers } from '@gluonjs/ssr';
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
  const uiOwner = installUi(document, { theme: 'light' });
  adoptStyles(document, atomStyles, moleculeStyles, organismStyles);
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
  uiOwner.dispose();
});

function formatViolations(violations: readonly Result[]): string {
  return violations.map((violation) => [
    `${violation.id}: ${violation.help}`,
    ...violation.nodes.map((node) => `${node.target.join(' ')} — ${node.failureSummary ?? 'failed'}`),
  ].join('\n')).join('\n');
}
