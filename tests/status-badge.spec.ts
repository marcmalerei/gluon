import { afterEach, describe, expect, it } from 'vitest';
import { render, unmount } from '@gluonjs/core';
import { StatusBadge } from '@gluonjs/atoms';

afterEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('StatusBadge', () => {
  it('keeps short localized labels on one line and bounds long tokens in tight containers', () => {
    const container = document.createElement('div');
    container.style.inlineSize = '12rem';
    document.body.append(container);

    render(StatusBadge({
      children: 'Eingeschränkt',
      tone: 'success',
    }), container);

    const badge = container.querySelector('.gluon-status-badge') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('Eingeschränkt');
    expect(getComputedStyle(badge).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(badge).overflow).toBe('hidden');
    expect(getComputedStyle(badge).textOverflow).toBe('ellipsis');
    expect(badge.getBoundingClientRect().width).toBeLessThanOrEqual(192);

    container.dir = 'rtl';
    render(StatusBadge({
      children: 'status-token-4f8d6e12e9a34a7d9f1b2c6a8d0e4f79',
      tone: 'warning',
    }), container);

    expect(badge.textContent).toBe('status-token-4f8d6e12e9a34a7d9f1b2c6a8d0e4f79');
    expect(getComputedStyle(badge).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(badge).overflow).toBe('hidden');
  });
});
