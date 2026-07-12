import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  Icon,
  Label,
  atomStyles,
  defineButtonPreset,
  defineIcon,
  installUi,
} from '@gluonjs/atoms';
import {
  adoptStyles,
  html,
  render,
  svg,
  unmount,
} from '@gluonjs/core';
import { Card, FormField } from '@gluonjs/molecules';
import { AppShell } from '@gluonjs/organisms';
import { Dialog, Field, Listbox, Overlay, Popover, q, unsafeQuarkProps } from '@gluonjs/quarks';

beforeEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-gluon-theme');
  document.adoptedStyleSheets = [];
});

describe('typed UI extensions', () => {
  it('composes a branded preset with native bindings and releases refs/listeners', () => {
    const ref: { value?: HTMLButtonElement } = {};
    const attributeClick = vi.fn();
    const analyticsClick = vi.fn();
    const componentClick = vi.fn();
    const PurchaseButton = defineButtonPreset({
      displayName: 'PurchaseButton',
      class: 'app-purchase',
      style: { '--gluon-button-background': '#171717' },
      attributes: {
        data: { analyticsAction: 'purchase' },
        dataset: { presetOwner: 'app' },
        onClick: { handleEvent: analyticsClick },
      },
    });

    render(PurchaseButton({
      label: 'Purchase',
      disabled: false,
      onClick: componentClick,
      attributes: {
        ref,
        class: 'checkout-action',
        style: { '--app-outline': '2px' },
        data: { productAction: 'buy' },
        aria: { describedby: 'purchase-help' },
        '.value': 'purchase',
        onClick: attributeClick,
      },
    }), document.body);

    const button = ref.value!;
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.type).toBe('button');
    expect(button.value).toBe('purchase');
    expect(button.classList.contains('gluon-button')).toBe(true);
    expect(button.classList.contains('app-purchase')).toBe(true);
    expect(button.classList.contains('checkout-action')).toBe(true);
    expect(button.dataset.analyticsAction).toBe('purchase');
    expect(button.dataset.productAction).toBe('buy');
    expect(button.getAttribute('aria-describedby')).toBe('purchase-help');
    expect(button.style.getPropertyValue('--gluon-button-background')).toBe('#171717');
    expect(button.style.getPropertyValue('--app-outline')).toBe('2px');

    button.click();
    expect(attributeClick).toHaveBeenCalledOnce();
    expect(analyticsClick).toHaveBeenCalledOnce();
    expect(componentClick).toHaveBeenCalledOnce();

    unmount(document.body);
    expect(ref.value).toBeUndefined();
    button.click();
    expect(attributeClick).toHaveBeenCalledOnce();
    expect(analyticsClick).toHaveBeenCalledOnce();
    expect(componentClick).toHaveBeenCalledOnce();
  });

  it('keeps cancellation explicit and supports a preset with no native defaults', () => {
    const componentClick = vi.fn();
    const cancel = vi.fn((event: MouseEvent) => event.preventDefault());
    const MinimalButton = defineButtonPreset({ displayName: 'MinimalButton' });
    render(q.div({ children: [
      MinimalButton({ label: 'Minimal' }),
      Button({ label: 'Cancel', onClick: componentClick, attributes: { onClick: cancel } }),
    ] }), document.body);

    document.querySelectorAll('button')[1]?.click();
    expect(cancel).toHaveBeenCalledOnce();
    expect(componentClick).not.toHaveBeenCalled();
  });

  it('renders app-owned decorative and informative icons without weakening semantics', () => {
    const icon = defineIcon({
      name: 'app-bag',
      viewBox: '0 0 24 24',
      body: svg`<path data-app-shape d="M6 8h12l1 13H5L6 8"></path>`,
    });
    const decorativeRef: { value?: SVGSVGElement } = {};
    const informativeRef: { value?: SVGSVGElement } = {};

    render(q.div({ children: [
      Icon({ icon, attributes: { ref: decorativeRef, class: 'app-icon' } }),
      Icon({
        icon,
        label: 'Shopping bag',
        size: 24,
        attributes: {
          ref: informativeRef,
          data: { iconOwner: 'app' },
          aria: { describedby: 'bag-help' },
        },
      }),
    ] }), document.body);

    expect(decorativeRef.value?.getAttribute('aria-hidden')).toBe('true');
    expect(decorativeRef.value?.hasAttribute('role')).toBe(false);
    expect(decorativeRef.value?.classList.contains('app-icon')).toBe(true);
    expect(informativeRef.value?.getAttribute('role')).toBe('img');
    expect(informativeRef.value?.getAttribute('aria-label')).toBe('Shopping bag');
    expect(informativeRef.value?.getAttribute('aria-describedby')).toBe('bag-help');
    expect(informativeRef.value?.dataset.iconOwner).toBe('app');
    expect(informativeRef.value?.querySelector('[data-app-shape]')).not.toBeNull();
    expect(informativeRef.value?.getAttribute('width')).toBe('24');
    expect(() => defineIcon({ name: ' ', viewBox: '0 0 24 24', body: svg`` })).toThrow(/name cannot be empty/i);
    expect(() => defineIcon({ name: 'empty-viewbox', viewBox: ' ', body: svg`` })).toThrow(/viewBox cannot be empty/i);
    expect(() => defineIcon({ name: 'html-body', viewBox: '0 0 24 24', body: html`<path></path>` })).toThrow(/svg template tag/i);
  });

  it('isolates reviewed unknown native keys behind the explicit unsafe helper', () => {
    render(q.button(unsafeQuarkProps<HTMLButtonElement>({
      'vendor-future-key': 'reviewed',
      children: 'Future platform control',
    })), document.body);
    expect(document.querySelector('button')?.getAttribute('vendor-future-key')).toBe('reviewed');
  });

  it('forwards native extensions through the composed layers and preserves keyboard behavior', () => {
    const refs = {
      overlay: {} as { value?: HTMLDivElement },
      dialog: {} as { value?: HTMLDivElement },
      listbox: {} as { value?: HTMLDivElement },
      popover: {} as { value?: HTMLDivElement },
      quark: {} as { value?: HTMLButtonElement },
      field: {} as { value?: HTMLLabelElement },
      label: {} as { value?: HTMLSpanElement },
      card: {} as { value?: HTMLElement },
      input: {} as { value?: HTMLInputElement },
      formField: {} as { value?: HTMLLabelElement },
      shell: {} as { value?: HTMLDivElement },
    };
    const dismiss = vi.fn();
    const change = vi.fn();

    render(AppShell({
      attributes: { ref: refs.shell, data: { layer: 'organism' } },
      children: Card({
        title: 'Extensions',
        attributes: { ref: refs.card, data: { layer: 'molecule' }, class: 'app-card' },
        children: [
          q.button({ ref: refs.quark, children: 'Native Quark' }),
          Label({ children: 'Standalone label', attributes: { ref: refs.label } }),
          Popover({ id: 'extension-help', children: 'Help', attributes: { ref: refs.popover } }),
          Field({ label: 'Reference', attributes: { ref: refs.field }, children: q.input({ name: 'reference' }) }),
          FormField({
            label: 'Email',
            attributes: { ref: refs.input, autocomplete: 'email', data: { layer: 'atom' } },
            fieldAttributes: { ref: refs.formField, class: 'app-field' },
          }),
          Overlay({
            onDismiss: dismiss,
            attributes: { ref: refs.overlay, class: 'app-overlay' },
            children: Dialog({
              label: 'Preferences',
              attributes: { ref: refs.dialog, data: { layer: 'quark' } },
              children: Listbox({
                id: 'finish-extension',
                label: 'Finish',
                value: 'black',
                onChange: change,
                attributes: { ref: refs.listbox, aria: { describedby: 'finish-help' } },
                options: [
                  { value: 'black', label: 'Black' },
                  { value: 'blue', label: 'Blue' },
                ],
              }),
            }),
          }),
        ],
      }),
    }), document.body);

    expect(Object.values(refs).every((ref) => ref.value instanceof Element)).toBe(true);
    expect(refs.shell.value?.dataset.layer).toBe('organism');
    expect(refs.card.value?.dataset.layer).toBe('molecule');
    expect(refs.input.value?.getAttribute('autocomplete')).toBe('email');
    expect(refs.input.value?.dataset.layer).toBe('atom');
    expect(refs.dialog.value?.getAttribute('role')).toBe('dialog');
    expect(refs.listbox.value?.getAttribute('aria-describedby')).toBe('finish-help');

    refs.listbox.value?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    }));
    expect(change).toHaveBeenCalledWith('blue');
    refs.overlay.value?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('retains light and dark theme tokens with extension styles', () => {
    const uiOwner = installUi(document, { theme: 'light' });
    uiOwner.styleOwner.retain(atomStyles);

    expect(getComputedStyle(document.documentElement).getPropertyValue('--gluon-color-action').trim()).toBe('#087f7b');
    uiOwner.setTheme('dark');
    expect(getComputedStyle(document.documentElement).getPropertyValue('--gluon-color-action').trim()).toBe('#65d5c8');

    uiOwner.dispose();
  });
});
