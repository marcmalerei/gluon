import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fragment, HoverCard, q, Tooltip, type AnchoredOverlayTriggerAttributes, type OverlayPlacement } from '@gluonjs/quarks';
import { render, unmount, type TemplateValue } from '@gluonjs/core';

const trigger = (label: string) => (attributes: AnchoredOverlayTriggerAttributes): TemplateValue => q.button({
  ...attributes,
  type: 'button',
  children: label,
});

function mount(value: TemplateValue): void {
  render(fragment([value]), document.body);
}

function pointer(target: EventTarget, type: string, pointerType: string): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType }));
}

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}

beforeEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
});

afterEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Tooltip and HoverCard anchored overlays', () => {
  it('serializes owned ARIA onto the actual controls before interaction', () => {
    mount(fragment([
      Tooltip({ id: 'shipping-tip', trigger: trigger('Shipping help'), content: 'Ships tomorrow.' }),
      HoverCard({ id: 'maker-card', label: 'Maker details', trigger: trigger('Maker'), content: 'Made in Berlin.' }),
    ]));

    const tooltipTrigger = document.querySelector<HTMLButtonElement>('#shipping-tip-trigger')!;
    const tooltip = document.querySelector<HTMLElement>('#shipping-tip-content')!;
    const cardTrigger = document.querySelector<HTMLButtonElement>('#maker-card-trigger')!;
    expect(tooltipTrigger.getAttribute('aria-describedby')).toBe('shipping-tip-content');
    expect(tooltipTrigger.hasAttribute('aria-expanded')).toBe(false);
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.hasAttribute('tabindex')).toBe(false);
    expect(cardTrigger.getAttribute('aria-controls')).toBe('maker-card-content');
    expect(cardTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(cardTrigger.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('keeps focus on a HoverCard trigger until intentional keyboard entry and restores it on Escape', async () => {
    mount(HoverCard({
      id: 'keyboard-card',
      label: 'Keyboard details',
      trigger: trigger('Open details'),
      content: q.a({ href: '#details', children: 'Read details' }),
      delay: 0,
    }));
    const control = document.querySelector<HTMLButtonElement>('#keyboard-card-trigger')!;
    const popup = document.querySelector<HTMLElement>('#keyboard-card-content')!;
    const link = popup.querySelector<HTMLAnchorElement>('a')!;
    control.focus();
    expect(document.activeElement).toBe(control);
    expect(control.getAttribute('aria-expanded')).toBe('true');
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    expect(document.activeElement).toBe(link);
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popup.hidden).toBe(true);
    expect(control.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(control);
  });

  it('opens Tooltip deterministically for mouse delay and touch without synthetic hover', () => {
    vi.useFakeTimers();
    mount(Tooltip({ id: 'input-tip', trigger: trigger('Input help'), content: 'Description', delay: 200 }));
    const control = document.querySelector<HTMLButtonElement>('#input-tip-trigger')!;
    const popup = document.querySelector<HTMLElement>('#input-tip-content')!;
    pointer(control, 'pointerenter', 'mouse');
    vi.advanceTimersByTime(199);
    expect(popup.hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(popup.hidden).toBe(false);
    pointer(document.body, 'pointerdown', 'mouse');
    expect(popup.hidden).toBe(true);
    pointer(control, 'pointerdown', 'touch');
    control.click();
    expect(popup.hidden).toBe(false);
    expect(popup.style.pointerEvents).toBe('none');
    expect(document.activeElement).not.toBe(popup);
  });

  it('opens on a mouse click even when pointer focus happens before click', () => {
    mount(Tooltip({ id: 'click-tip', trigger: trigger('Click help'), content: 'Click description', delay: 500 }));
    const control = document.querySelector<HTMLButtonElement>('#click-tip-trigger')!;
    const popup = document.querySelector<HTMLElement>('#click-tip-content')!;
    pointer(control, 'pointerdown', 'mouse');
    control.focus();
    control.click();
    expect(popup.hidden).toBe(false);
  });

  it('retains an interactive surface across pointer entry and closes after pointer and focus leave', () => {
    vi.useFakeTimers();
    mount(HoverCard({
      id: 'ownership-card',
      label: 'Ownership',
      trigger: trigger('Ownership'),
      content: q.button({ type: 'button', children: 'Inside' }),
      delay: 0,
    }));
    const control = document.querySelector<HTMLButtonElement>('#ownership-card-trigger')!;
    const popup = document.querySelector<HTMLElement>('#ownership-card-content')!;
    control.focus();
    expect(popup.hidden).toBe(false);

    pointer(control, 'pointerdown', 'mouse');
    pointer(control, 'pointercancel', 'mouse');
    pointer(control, 'pointerleave', 'mouse');
    pointer(popup, 'pointerenter', 'mouse');
    vi.advanceTimersByTime(80);
    expect(popup.hidden).toBe(false);

    document.body.tabIndex = -1;
    document.body.focus();
    popup.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    pointer(popup, 'pointerleave', 'mouse');
    vi.advanceTimersByTime(79);
    expect(popup.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(popup.hidden).toBe(true);

    unmount(document.body);
    document.body.replaceChildren();
    expect(() => mount(HoverCard({
      id: 'ownership-card',
      label: 'Replacement',
      trigger: trigger('Replacement'),
      content: 'Replacement details',
      delay: 0,
    }))).not.toThrow();
  });

  it('covers keyboard entry fallback and delayed close ownership', async () => {
    vi.useFakeTimers();
    mount(HoverCard({ id: 'fallback-card', label: 'Fallback', trigger: trigger('Fallback'), content: 'No focusable content', delay: 0 }));
    const control = document.querySelector<HTMLButtonElement>('#fallback-card-trigger')!;
    const popup = document.querySelector<HTMLElement>('#fallback-card-content')!;
    control.focus();
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    expect(document.activeElement).toBe(popup);
    popup.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popup.hidden).toBe(true);
  });

  it('dismisses nested overlays from the inside out on document-level outside interaction', () => {
    mount(HoverCard({
      id: 'outer-card', label: 'Outer', trigger: trigger('Outer'), delay: 0,
      content: HoverCard({
        id: 'inner-card', label: 'Inner', trigger: trigger('Inner'), content: 'Nested details', delay: 0,
      }),
    }));
    const outerTrigger = document.querySelector<HTMLButtonElement>('#outer-card-trigger')!;
    outerTrigger.click();
    const innerTrigger = document.querySelector<HTMLButtonElement>('#inner-card-trigger')!;
    innerTrigger.click();
    const outer = document.querySelector<HTMLElement>('#outer-card-content')!;
    const inner = document.querySelector<HTMLElement>('#inner-card-content')!;
    expect(outer.hidden).toBe(false);
    expect(inner.hidden).toBe(false);
    pointer(document.body, 'pointerdown', 'mouse');
    expect(inner.hidden).toBe(true);
    expect(outer.hidden).toBe(false);
    pointer(document.body, 'pointerdown', 'mouse');
    expect(outer.hidden).toBe(true);
  });

  it.each([
    ['block-start', 200, 132],
    ['block-end', 200, 248],
    ['inline-start', 92, 200],
    ['inline-end', 248, 200],
  ] as const)('positions %s with real fixed coordinates', (placement, expectedLeft, expectedTop) => {
    mount(Tooltip({ id: `position-${placement}`, trigger: trigger(placement), content: 'Positioned', placement, delay: 0 }));
    const control = document.querySelector<HTMLButtonElement>(`#position-${placement}-trigger`)!;
    const popup = document.querySelector<HTMLElement>(`#position-${placement}-content`)!;
    control.getBoundingClientRect = () => rect(200, 200, 40, 40);
    popup.getBoundingClientRect = () => rect(0, 0, 100, 60);
    control.focus();
    expect(popup.style.position).toBe('fixed');
    expect(popup.style.left).toBe(`${expectedLeft}px`);
    expect(popup.style.top).toBe(`${expectedTop}px`);
    expect(popup.dataset.placement).toBe(placement);
  });

  it('flips, clamps, honors RTL logical placement, and repositions on scroll', () => {
    mount(fragment([
      Tooltip({ id: 'collision-tip', trigger: trigger('Collision'), content: 'Collision', placement: 'block-end', delay: 0 }),
      Tooltip({ id: 'rtl-tip', trigger: trigger('RTL'), content: 'RTL', placement: 'inline-start', delay: 0 }),
    ]));
    const collisionTrigger = document.querySelector<HTMLButtonElement>('#collision-tip-trigger')!;
    const collision = document.querySelector<HTMLElement>('#collision-tip-content')!;
    let collisionX = -20;
    collisionTrigger.getBoundingClientRect = () => rect(collisionX, window.innerHeight - 30, 40, 20);
    collision.getBoundingClientRect = () => rect(0, 0, 120, 60);
    collisionTrigger.focus();
    expect(collision.dataset.placement).toBe('block-start');
    expect(collision.style.left).toBe('8px');
    collisionX = 300;
    window.dispatchEvent(new Event('scroll'));
    expect(collision.style.left).toBe(`${Math.min(300, window.innerWidth - 128)}px`);

    const rtlTrigger = document.querySelector<HTMLButtonElement>('#rtl-tip-trigger')!;
    const rtl = document.querySelector<HTMLElement>('#rtl-tip-content')!;
    rtlTrigger.dir = 'rtl';
    rtlTrigger.getBoundingClientRect = () => rect(200, 200, 40, 40);
    rtl.getBoundingClientRect = () => rect(0, 0, 100, 60);
    rtlTrigger.focus();
    expect(rtl.style.left).toBe('248px');
    expect(rtl.dataset.placement).toBe('inline-start');
  });

  it('removes open listeners/observers and pending timers when unmounted or externally removed', async () => {
    vi.useFakeTimers();
    const add = vi.spyOn(document, 'addEventListener');
    mount(Tooltip({ id: 'cleanup-tip', trigger: trigger('Cleanup'), content: 'Cleanup', delay: 500 }));
    const control = document.querySelector<HTMLButtonElement>('#cleanup-tip-trigger')!;
    pointer(control, 'pointerenter', 'mouse');
    unmount(document.body);
    vi.advanceTimersByTime(500);
    expect(document.querySelector('#cleanup-tip-content')).toBeNull();

    mount(HoverCard({ id: 'cleanup-card', label: 'Cleanup', trigger: trigger('Cleanup'), content: 'Cleanup', delay: 0 }));
    document.querySelector<HTMLButtonElement>('#cleanup-card-trigger')!.click();
    const pointerRegistration = add.mock.calls.find(([type]) => type === 'pointerdown');
    const signal = (pointerRegistration?.[2] as AddEventListenerOptions | undefined)?.signal;
    expect(signal?.aborted).toBe(false);
    document.querySelector<HTMLElement>('.gluon-anchored-overlay')!.remove();
    await Promise.resolve();
    await Promise.resolve();
    expect(signal?.aborted).toBe(true);
  });

  it('reduces delayed opening without owning forced-color presentation', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => true,
    }));
    mount(Tooltip({ id: 'media-tip', trigger: trigger('Media'), content: 'Media', delay: 10_000 }));
    const control = document.querySelector<HTMLButtonElement>('#media-tip-trigger')!;
    const popup = document.querySelector<HTMLElement>('#media-tip-content')!;
    pointer(control, 'pointerenter', 'mouse');
    expect(popup.hidden).toBe(false);
    expect(popup.style.color).toBe('');
    expect(popup.style.backgroundColor).toBe('');
    expect(popup.style.borderColor).toBe('');
  });

  it('rejects invalid configuration, ownership conflicts, and duplicate live ids', () => {
    expect(() => Tooltip({ id: 'bad:id', trigger: trigger('Bad'), content: 'Bad' })).toThrow(/HTML-safe id/);
    expect(() => Tooltip({ id: 'bad-placement', trigger: trigger('Bad'), content: 'Bad', placement: 'center' as OverlayPlacement })).toThrow(/placement/);
    expect(() => Tooltip({ id: 'bad-delay', trigger: trigger('Bad'), content: 'Bad', delay: Number.NaN })).toThrow(/delay/);
    expect(() => Tooltip({ id: 'bad-content', trigger: trigger('Bad'), content: 'Bad', contentAttributes: { role: 'dialog' } as never })).toThrow(/contentAttributes.role/);
    expect(() => mount(fragment([
      Tooltip({ id: 'duplicate', trigger: trigger('First'), content: 'First' }),
      Tooltip({ id: 'duplicate', trigger: trigger('Second'), content: 'Second' }),
    ]))).toThrow(/Duplicate anchored overlay id/);
  });
});
