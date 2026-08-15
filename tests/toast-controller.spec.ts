import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, getStyleSheetText } from '@gluonjs/core';
import { nextTick } from '@gluonjs/reactivity';
import {
  ToastViewport,
  createToastController,
  toastStyles,
  type ToastController,
} from '@gluonjs/molecules';

beforeEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

afterEach(() => vi.useRealTimers());

describe('Toast controller lifecycle', () => {
  it('validates options, requests, timeouts, IDs, and records with stable diagnostics', () => {
    expect(() => createToastController({ maxVisible: 0 })).toThrow(
      'Toast maxVisible must be a safe integer between 1 and 100.',
    );
    expect(() => createToastController({ maxQueue: -1 })).toThrow(
      'Toast maxQueue must be a safe integer between 0 and 1000.',
    );
    expect(() => createToastController({ timeout: Number.POSITIVE_INFINITY })).toThrow(
      'Toast timeout must be a safe integer between 1 and 86400000.',
    );
    expect(() => createToastController({ minimumDuration: 4_999 })).toThrow(
      'Toast minimumDuration must be a safe integer between 5000 and 86400000.',
    );
    expect(() => createToastController(null as never)).toThrow(
      'Toast controller options must be a record.',
    );
    const controller = createToastController();
    controller.activate();
    expect(() => controller.add(null as never)).toThrow('Toast request must be a record.');
    expect(() => controller.add({} as never)).toThrow('Toast request must define children.');
    expect(() => controller.add({ id: 'not safe', children: 'Bad' })).toThrow(
      'Toast id must be a non-empty safe DOM ID matching [A-Za-z][A-Za-z0-9_-]*.',
    );
    expect(() => controller.add({ children: 'Bad', timeout: 0 })).toThrow(
      'Toast item timeout must be a safe integer between 1 and 86400000.',
    );
    expect(() => controller.add({ children: 'Bad', announcement: 'off' as never })).toThrow(
      'Toast announcement must be polite or assertive.',
    );
  });

  it('keeps reads side-effect free and starts queued countdowns only upon promotion', () => {
    vi.useFakeTimers();
    const controller = createToastController({ maxVisible: 1, maxQueue: 2 });
    controller.activate();
    controller.add({ id: 'first-toast', children: 'First' });
    controller.add({ id: 'queued-toast', children: 'Queued' });
    expect(vi.getTimerCount()).toBe(1);
    expect(controller.items.map(({ id }) => id)).toEqual(['first-toast']);
    expect(controller.items.map(({ id }) => id)).toEqual(['first-toast']);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(5_000);
    expect(controller.items.map(({ id }) => id)).toEqual(['queued-toast']);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(4_999);
    expect(controller.items).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(controller.items).toHaveLength(0);
  });

  it('resets a replaced ID timer, promotes it, and rejects the stale callback', () => {
    vi.useFakeTimers();
    const controller = createToastController({ maxVisible: 1 });
    controller.activate();
    controller.add({ id: 'stable-toast', children: 'Old' });
    controller.add({ id: 'other-toast', children: 'Other' });
    vi.advanceTimersByTime(3_000);
    controller.add({ id: 'stable-toast', children: 'Replacement' });
    expect(controller.items[0]?.children).toBe('Replacement');
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2_000);
    expect(controller.items[0]?.children).toBe('Replacement');
    vi.advanceTimersByTime(3_000);
    expect(controller.items[0]?.id).toBe('other-toast');
  });

  it('preserves the exact deadline until every pause owner resumes', () => {
    vi.useFakeTimers();
    const controller = createToastController();
    controller.activate();
    controller.add({ id: 'owned-pause', children: 'Pause me' });
    vi.advanceTimersByTime(1_234);
    controller.pause('owned-pause', 'pointer');
    controller.pause('owned-pause', 'focus');
    vi.advanceTimersByTime(20_000);
    controller.resume('owned-pause', 'pointer');
    vi.advanceTimersByTime(20_000);
    expect(controller.items).toHaveLength(1);
    controller.resume('owned-pause', 'focus');
    vi.advanceTimersByTime(3_765);
    expect(controller.items).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(controller.items).toHaveLength(0);
  });

  it('makes dismiss, clear, deactivate, and dispose idempotent without surviving callbacks', () => {
    vi.useFakeTimers();
    const controller = createToastController();
    controller.activate();
    controller.add({ id: 'cleanup-toast', children: 'Cleanup' });
    controller.dismiss('missing-toast');
    controller.clear();
    controller.clear();
    controller.deactivate();
    controller.deactivate();
    controller.dispose();
    controller.dispose();
    expect(controller.items).toEqual([]);
    expect(controller.active).toBe(false);
    expect(controller.disposed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    vi.runAllTimers();
    expect(() => controller.add({ children: 'Late' })).toThrow('Toast controller has been disposed.');
  });
});

describe('Toast browser contract', () => {
  it('renders one live message, keeps controls outside it, and preserves keyed DOM identity', async () => {
    const controller = createToastController({ maxVisible: 2, timeout: 60_000 });
    const { root, app } = await mountViewport(controller, {
      label: 'Bag updates',
      dismissLabel: (record) => `Dismiss ${record.id}`,
    });
    controller.add({ id: 'polite-toast', title: 'Added', children: 'Orbit Lamp', tone: 'success' });
    controller.add({ id: 'assertive-toast', children: 'Inventory changed', announcement: 'assertive' });
    await nextTick();

    const region = root.querySelector('[role="region"][aria-label="Bag updates"]');
    const polite = root.querySelector<HTMLElement>('#polite-toast')!;
    const politeLive = polite.querySelector('[role="status"]')!;
    expect(region).not.toBeNull();
    expect(polite.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);
    expect(politeLive.getAttribute('aria-atomic')).toBe('true');
    expect(politeLive.hasAttribute('aria-live')).toBe(false);
    expect(politeLive.querySelector('button')).toBeNull();
    expect(polite.querySelector('button')?.getAttribute('aria-label')).toBe('Dismiss polite-toast');
    expect(root.querySelector('#assertive-toast [role="alert"]')).not.toBeNull();

    controller.add({ id: 'queued-toast', children: 'Queued' });
    await nextTick();
    expect(root.querySelector('#polite-toast')).toBe(polite);
    expect(root.querySelector('#polite-toast [role="status"]')).toBe(politeLive);
    controller.dismiss('assertive-toast');
    await nextTick();
    expect(root.querySelector('#polite-toast')).toBe(polite);
    expect(root.querySelector('#polite-toast [role="status"]')).toBe(politeLive);
    expect(root.querySelector('#queued-toast')).not.toBeNull();
    controller.add({ id: 'polite-toast', children: 'Updated once' });
    await nextTick();
    expect(root.querySelector('#polite-toast')).toBe(polite);
    expect(root.querySelector('#polite-toast [role="status"]')).toBe(politeLive);
    expect(polite.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);
    app.unmount();
    controller.dispose();
  });

  it('supports pointer and nested focus pause ownership, keyboard dismissal, and accessibility', async () => {
    vi.useFakeTimers();
    const controller = createToastController();
    const { root, app } = await mountViewport(controller);
    controller.add({ id: 'interactive-toast', children: 'Keyboard accessible' });
    await nextTick();
    const toast = root.querySelector<HTMLElement>('#interactive-toast')!;
    const dismiss = toast.querySelector<HTMLButtonElement>('button')!;
    vi.advanceTimersByTime(1_000);
    toast.dispatchEvent(new PointerEvent('pointerenter'));
    dismiss.focus();
    toast.dispatchEvent(new PointerEvent('pointerleave'));
    vi.advanceTimersByTime(10_000);
    expect(root.querySelector('#interactive-toast')).not.toBeNull();
    dismiss.blur();
    vi.advanceTimersByTime(3_999);
    expect(root.querySelector('#interactive-toast')).not.toBeNull();
    vi.advanceTimersByTime(1);
    await nextTick();
    expect(root.querySelector('#interactive-toast')).toBeNull();

    vi.useRealTimers();
    controller.add({ id: 'keyboard-toast', children: 'Dismiss with keyboard' });
    await nextTick();
    const keyboardDismiss = root.querySelector<HTMLButtonElement>('#keyboard-toast button')!;
    keyboardDismiss.focus();
    await userEvent.keyboard('{Enter}');
    await nextTick();
    expect(root.querySelector('#keyboard-toast')).toBeNull();
    expect((await axe.run(root)).violations).toEqual([]);
    app.unmount();
    controller.dispose();
  });

  it('ships logical RTL positioning, forced-colors, reduced-motion, small-width, and 44px controls', async () => {
    await page.viewport(390, 844);
    const css = getStyleSheetText(toastStyles);
    expect(css).toContain('inset-inline-end');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (max-width: 480px)');
    const controller = createToastController({ timeout: 60_000 });
    document.adoptedStyleSheets = [toastStyles];
    const { root, app } = await mountViewport(controller, { attributes: { dir: 'rtl' } });
    controller.add({ id: 'responsive-toast', children: 'A long notification that wraps safely.' });
    await nextTick();
    const region = root.querySelector<HTMLElement>('[role="region"]')!;
    const dismiss = root.querySelector<HTMLButtonElement>('.gluon-toast-dismiss')!;
    expect(region.dir).toBe('rtl');
    expect(window.innerWidth).toBe(390);
    expect(region.getBoundingClientRect().width).toBeLessThanOrEqual(358);
    expect(getComputedStyle(dismiss).minInlineSize).toBe('44px');
    expect(getComputedStyle(dismiss).minBlockSize).toBe('44px');
    app.unmount();
    controller.dispose();
    await page.viewport(1280, 720);
  });
});

async function mountViewport(
  controller: ToastController,
  props: Partial<Parameters<typeof ToastViewport>[0]> = {},
) {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp(() => ToastViewport({ controller, ...props }));
  app.mount(root);
  if (vi.isFakeTimers()) vi.runAllTicks();
  await Promise.resolve();
  await nextTick();
  expect(controller.active).toBe(true);
  return { root, app };
}
