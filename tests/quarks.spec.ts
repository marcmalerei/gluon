import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../src/index.js';
import { fragment, htmlTagNames, q, quark } from '../src/quarks/index.js';

describe('quarks', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('provides a cached typed factory for every documented HTML tag', () => {
    expect(new Set(htmlTagNames).size).toBe(htmlTagNames.length);
    for (const tagName of htmlTagNames) {
      expect(q[tagName].tagName).toBe(tagName);
      expect(q[tagName].layer).toBe('quark');
      expect(q[tagName]).toBe(q[tagName]);
    }
    expect((q as unknown as { then?: unknown }).then).toBeUndefined();
  });

  it('renders element props through first-class spreading', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    render(q.button({
      id: 'save',
      class: { action: true },
      '?disabled': false,
      data: { testId: 'save' },
      aria: { label: 'Save changes' },
      onClick: click,
      children: 'Save',
    }), root);

    const button = root.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(button.classList.contains('gluon')).toBe(true);
    expect(button.classList.contains('quark')).toBe(true);
    expect(button.classList.contains('action')).toBe(true);
    expect(button.dataset.testId).toBe('save');
    expect(button.getAttribute('aria-label')).toBe('Save changes');
    expect(click).toHaveBeenCalledOnce();
  });

  it('supports custom-element quarks and fragment composition', () => {
    const root = document.createElement('div');
    const custom = quark('demo-panel');

    render(fragment([
      q.span({ children: 'before' }),
      custom({ children: q.strong({ children: 'inside' }) }),
    ]), root);

    expect(root.innerHTML).toContain('<demo-panel');
    expect(root.querySelector('demo-panel strong')?.textContent).toBe('inside');
  });

  it('rejects children for void elements', () => {
    expect(() => q.input({ children: 'invalid' })).toThrow(/cannot receive children/i);
  });
});
