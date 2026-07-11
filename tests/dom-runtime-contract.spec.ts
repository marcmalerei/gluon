import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  defineElement,
  directive,
  event,
  html,
  nothing,
  repeat,
  render,
  suspendRender,
  svg,
  unmount,
  unsafeHTML,
  unsafeURL,
} from '../src/index.js';

let lifecycleElementSequence = 0;

describe('DOM runtime contract', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('inserts one new node directly and batches multiple new nodes in a fragment', () => {
    const createFragment = vi.spyOn(document, 'createDocumentFragment');
    try {
      const singleRoot = document.createElement('div');

      render(html`<p>${'single'}</p>`, singleRoot);

      expect(singleRoot.innerHTML).toBe('<p><!--gluon:0-->single</p>');
      expect(createFragment).not.toHaveBeenCalled();

      const multipleRoot = document.createElement('div');
      render(html`<p>${['first', 'second']}</p>`, multipleRoot);

      expect(multipleRoot.textContent).toBe('firstsecond');
      expect(createFragment).toHaveBeenCalledOnce();
    } finally {
      createFragment.mockRestore();
    }
  });

  it('instantiates multiple element bindings and nested child parts in traversal order', () => {
    const root = document.createElement('div');
    const view = (first: string, second: string, child: string, value: string) => html`
      <section data-first=${first} aria-label=${second}>
        <div data-second=${second}><span>${child}</span></div>
        <input .value=${value} ?disabled=${false}>
      </section>
    `;

    render(view('one', 'two', 'child-a', 'value-a'), root);
    const section = root.querySelector('section')!;
    const input = root.querySelector('input') as HTMLInputElement;

    expect(section.dataset.first).toBe('one');
    expect(section.getAttribute('aria-label')).toBe('two');
    expect(section.querySelector('div')?.dataset.second).toBe('two');
    expect(section.querySelector('span')?.textContent).toBe('child-a');
    expect(input.value).toBe('value-a');
    expect(input.disabled).toBe(false);

    render(view('next', 'label', 'child-b', 'value-b'), root);

    expect(root.querySelector('section')).toBe(section);
    expect(root.querySelector('input')).toBe(input);
    expect(section.dataset.first).toBe('next');
    expect(section.getAttribute('aria-label')).toBe('label');
    expect(section.querySelector('div')?.dataset.second).toBe('label');
    expect(section.querySelector('span')?.textContent).toBe('child-b');
    expect(input.value).toBe('value-b');
  });

  it('runs lifecycle directives through mount, update, cleanup, and disconnect', () => {
    const root = document.createElement('div');
    const calls: string[] = [];
    const lifecycle = directive<[string]>({
      mount(part, [value]) {
        calls.push(`mount:${value}`);
        part.setValue(value);
      },
      update(part, [value], [previous]) {
        calls.push(`update:${previous}->${value}`);
        part.setValue(value);
      },
      cleanup(_part, [value]) {
        calls.push(`cleanup:${value}`);
      },
      disconnect(_part, [value]) {
        calls.push(`disconnect:${value}`);
      },
    });
    const view = (value: string | null) => html`<p>${value === null ? 'plain' : lifecycle(value)}</p>`;

    render(view('first'), root);
    render(view('second'), root);
    render(view(null), root);
    render(view('third'), root);
    unmount(root);

    expect(calls).toEqual([
      'mount:first',
      'cleanup:first',
      'update:first->second',
      'cleanup:second',
      'disconnect:second',
      'mount:third',
      'cleanup:third',
      'disconnect:third',
    ]);
    expect(root.childNodes).toHaveLength(0);
  });

  it('disconnects a lifecycle directive on suspension and mounts it on resume', () => {
    const root = document.createElement('div');
    const calls: string[] = [];
    const lifecycle = directive<[string]>({
      mount(part, [value]) {
        calls.push(`mount:${value}`);
        part.setValue(value);
      },
      update(part, [value]) {
        calls.push(`update:${value}`);
        part.setValue(value);
      },
      cleanup(_part, [value]) {
        calls.push(`cleanup:${value}`);
      },
      disconnect(_part, [value]) {
        calls.push(`disconnect:${value}`);
      },
    });
    const view = () => html`<p>${lifecycle('retained')}</p>`;

    render(view(), root);
    const paragraph = root.querySelector('p');
    suspendRender(root);
    render(view(), root);

    expect(root.querySelector('p')).toBe(paragraph);
    expect(calls).toEqual([
      'mount:retained',
      'cleanup:retained',
      'disconnect:retained',
      'mount:retained',
    ]);
  });

  it('disconnects a failed directive update with the last active arguments', () => {
    const root = document.createElement('div');
    const calls: string[] = [];
    const lifecycle = directive<[string]>({
      mount(part, [value]) {
        calls.push(`mount:${value}`);
        part.setValue(value);
      },
      update(_part, [value], [previous]) {
        calls.push(`update:${previous}->${value}`);
        throw new Error('update failed');
      },
      cleanup(_part, [value]) {
        calls.push(`cleanup:${value}`);
      },
      disconnect(_part, [value]) {
        calls.push(`disconnect:${value}`);
      },
    });
    const view = (value: string) => html`<p>${lifecycle(value)}</p>`;

    render(view('active'), root);
    expect(() => render(view('failed'), root)).toThrow('update failed');
    unmount(root);

    expect(calls).toEqual([
      'mount:active',
      'cleanup:active',
      'update:active->failed',
      'disconnect:active',
    ]);
  });

  it('supports lifecycle directives and raw markup inside array and keyed items', () => {
    const root = document.createElement('div');
    const calls: string[] = [];
    const lifecycle = directive<[string]>({
      mount(part, [value]) {
        calls.push(`mount:${value}`);
        part.setValue(value);
      },
      update(part, [value], [previous]) {
        calls.push(`update:${previous}->${value}`);
        part.setValue(value);
      },
      cleanup(_part, [value]) {
        calls.push(`cleanup:${value}`);
      },
      disconnect(_part, [value]) {
        calls.push(`disconnect:${value}`);
      },
    });
    const arrayView = (value: string, visible: boolean) => html`
      <div>${visible ? [lifecycle(value), unsafeHTML('<b>raw</b>')] : []}</div>
    `;

    render(arrayView('array-a', true), root);
    const raw = root.querySelector('b');
    render(arrayView('array-b', true), root);
    expect(root.querySelector('b')).toBe(raw);
    render(arrayView('array-b', false), root);

    const keyedView = (value: string, visible: boolean) => html`
      <div>${repeat(
        visible ? [{ id: 'stable', value }] : [],
        (item) => item.id,
        (item) => lifecycle(item.value),
      )}</div>
    `;
    render(keyedView('keyed-a', true), root);
    render(keyedView('keyed-b', true), root);
    render(keyedView('keyed-b', false), root);

    expect(calls).toEqual([
      'mount:array-a',
      'cleanup:array-a',
      'update:array-a->array-b',
      'cleanup:array-b',
      'disconnect:array-b',
      'mount:keyed-a',
      'cleanup:keyed-a',
      'update:keyed-a->keyed-b',
      'cleanup:keyed-b',
      'disconnect:keyed-b',
    ]);
  });

  it('continues directive cleanup and clears DOM when one cleanup hook throws', () => {
    const root = document.createElement('div');
    const calls: string[] = [];
    const failing = directive<[]>({
      mount(part) {
        part.setValue('failing');
      },
      update() {},
      cleanup() {
        calls.push('cleanup:failing');
        throw new Error('cleanup failed');
      },
      disconnect() {
        calls.push('disconnect:failing');
      },
    });
    const surviving = directive<[]>({
      mount(part) {
        part.setValue('surviving');
      },
      update() {},
      cleanup() {
        calls.push('cleanup:surviving');
      },
      disconnect() {
        calls.push('disconnect:surviving');
      },
    });

    render(html`<p>${failing()}</p><p>${surviving()}</p>`, root);

    expect(() => unmount(root)).toThrow('cleanup failed');
    expect(calls).toEqual([
      'cleanup:failing',
      'disconnect:failing',
      'cleanup:surviving',
      'disconnect:surviving',
    ]);
    expect(root.childNodes).toHaveLength(0);
  });

  it('supports capture, once, passive, signal, and spread event options', () => {
    const root = document.createElement('div');
    const order: string[] = [];
    const abortController = new AbortController();
    const aborted = vi.fn();
    const spreadOnce = vi.fn();
    const passive = vi.fn((passiveEvent: Event) => passiveEvent.preventDefault());

    render(html`
      <div @click=${event(() => order.push('capture'), true)}>
        <button id="once" @click=${event(() => order.push('once'), { once: true })}>Once</button>
      </div>
      <button id="aborted" @click=${event(aborted, { signal: abortController.signal })}>Abort</button>
      <button id="spread" ...=${{ onClick: event(spreadOnce, { once: true }) }}>Spread</button>
      <button id="passive" @wheel=${event(passive, { passive: true })}>Passive</button>
    `, root);

    const once = root.querySelector('#once') as HTMLButtonElement;
    once.click();
    once.click();
    expect(order).toEqual(['capture', 'once', 'capture']);

    abortController.abort();
    (root.querySelector('#aborted') as HTMLButtonElement).click();
    expect(aborted).not.toHaveBeenCalled();

    const spread = root.querySelector('#spread') as HTMLButtonElement;
    spread.click();
    spread.click();
    expect(spreadOnce).toHaveBeenCalledOnce();

    const wheel = new WheelEvent('wheel', { cancelable: true });
    (root.querySelector('#passive') as HTMLButtonElement).dispatchEvent(wheel);
    expect(passive).toHaveBeenCalledOnce();
    expect(wheel.defaultPrevented).toBe(false);
  });

  it('sets dynamic SVG/XML namespaces and preserves MathML namespaces', () => {
    const root = document.createElement('div');
    const graphic = (href: string | null, language: string | null) => svg`
      <svg>
        <use xlink:href=${href} xml:lang=${language}></use>
      </svg>
    `;

    render(graphic('#shape', 'en'), root);
    const use = root.querySelector('use') as SVGUseElement;
    expect(use.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#shape');
    expect(use.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang')).toBe('en');
    render(graphic(null, null), root);
    expect(use.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(false);
    expect(use.hasAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang')).toBe(false);

    render(svg`<svg xmlns=${'http://www.w3.org/2000/svg'}><g custom:value=${'plain'}></g></svg>`, root);
    const svgRoot = root.querySelector('svg') as SVGSVGElement;
    expect(svgRoot.getAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns')).toBe(
      'http://www.w3.org/2000/svg',
    );
    expect(root.querySelector('g')?.getAttribute('custom:value')).toBe('plain');

    render(html`<math><mi data-value=${'x'}>x</mi></math>`, root);
    expect(root.querySelector('math')?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    expect(root.querySelector('mi')?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
  });

  it('keeps dynamic strings inert and requires explicit raw HTML and URL escapes', () => {
    const root = document.createElement('div');
    const content = (value: string | ReturnType<typeof unsafeHTML>) => html`<section>${value}</section>`;

    render(content('<strong id="inert">text</strong>'), root);
    expect(root.querySelector('#inert')).toBeNull();
    expect(root.querySelector('section')?.textContent).toBe('<strong id="inert">text</strong>');

    const trusted = unsafeHTML('<strong id="trusted">trusted</strong>');
    render(content(trusted), root);
    const strong = root.querySelector('#trusted');
    render(content(trusted), root);
    expect(root.querySelector('#trusted')).toBe(strong);

    const propertyRoot = document.createElement('div');
    expect(() => render(html`<div .innerHTML=${'<em>blocked</em>'}></div>`, propertyRoot)).toThrow(
      /replaces renderer-owned DOM/i,
    );
    expect(() => render(
      html`<div .innerHTML=${unsafeHTML('<em>still blocked</em>')}></div>`,
      propertyRoot,
    )).toThrow(/replaces renderer-owned DOM/i);

    const frameRoot = document.createElement('div');
    expect(() => render(html`<iframe srcdoc=${'<p>blocked</p>'}></iframe>`, frameRoot)).toThrow(
      /srcdoc attribute requires an explicit unsafeHTML/i,
    );
    render(html`<iframe srcdoc=${unsafeHTML('<p>allowed</p>')}></iframe>`, frameRoot);
    expect(frameRoot.querySelector('iframe')?.getAttribute('srcdoc')).toBe('<p>allowed</p>');

    const propertyFrameRoot = document.createElement('div');
    expect(() => render(
      html`<iframe .srcdoc=${'<p>blocked</p>'}></iframe>`,
      propertyFrameRoot,
    )).toThrow(/srcdoc requires an explicit unsafeHTML/i);
    render(
      html`<iframe .srcdoc=${unsafeHTML('<p>allowed property</p>')}></iframe>`,
      propertyFrameRoot,
    );
    expect((propertyFrameRoot.querySelector('iframe') as HTMLIFrameElement).srcdoc).toBe(
      '<p>allowed property</p>',
    );

    const link = (href: string | ReturnType<typeof unsafeURL>) => html`<a href=${href}>Link</a>`;
    render(link('/safe'), root);
    const originalHref = root.querySelector('a')?.getAttribute('href');
    expect(() => render(link('java\nscript:alert(1)'), root)).toThrow(/blocked unsafe url protocol/i);
    expect(root.querySelector('a')?.getAttribute('href')).toBe(originalHref);
    render(link(unsafeURL('data:text/plain,reviewed')), root);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('data:text/plain,reviewed');

    expect(() => render(html`<a .href=${'javascript:alert(1)'}>Blocked</a>`, propertyRoot)).toThrow(
      /blocked unsafe url protocol/i,
    );
    render(html`<a .href=${unsafeURL('data:text/plain,reviewed')}>Reviewed</a>`, propertyRoot);
    expect((propertyRoot.querySelector('a') as HTMLAnchorElement).href).toContain('data:text/plain');

    expect(() => render(html`<button onclick=${'alert(1)'}>Blocked</button>`, propertyRoot)).toThrow(
      /string event-handler attributes/i,
    );
  });

  it('parses explicit raw markup in the surrounding SVG namespace', () => {
    const root = document.createElement('div');
    render(svg`<svg>${unsafeHTML('<circle cx="5" cy="5" r="4"></circle>')}</svg>`, root);
    expect(root.querySelector('circle')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('preserves contextual namespaces for raw markup inside arrays and keyed items', () => {
    const root = document.createElement('div');
    render(svg`
      <svg>
        ${[
          unsafeHTML('<circle id="array-circle"></circle>'),
          repeat(
            [{ id: 'keyed-circle' }],
            (item) => item.id,
            (item) => unsafeHTML(`<circle id="${item.id}"></circle>`),
          ),
        ]}
      </svg>
    `, root);

    expect(root.querySelector('#array-circle')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(root.querySelector('#keyed-circle')?.namespaceURI).toBe('http://www.w3.org/2000/svg');

    render(html`
      <math>
        ${[
          unsafeHTML('<mi id="array-mi">a</mi>'),
          repeat(
            [{ id: 'keyed-mi', value: 'b' }],
            (item) => item.id,
            (item) => unsafeHTML(`<mi id="${item.id}">${item.value}</mi>`),
          ),
        ]}
      </math>
    `, root);

    expect(root.querySelector('#array-mi')?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    expect(root.querySelector('#keyed-mi')?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
  });

  it('rejects binding-only helpers and destructive or mismatched sink values', () => {
    const listener = () => undefined;

    expect(() => render(html`<div>${event(listener)}</div>`, document.createElement('div'))).toThrow(
      /only be used in matching attribute bindings/i,
    );
    expect(() => render(
      html`<div>${unsafeURL('data:text/plain,reviewed')}</div>`,
      document.createElement('div'),
    )).toThrow(/only be used in matching attribute bindings/i);
    expect(() => render(
      html`<div title=${unsafeHTML('<b>wrong sink</b>')}></div>`,
      document.createElement('div'),
    )).toThrow(/unsafeHTML.*child content/i);
    expect(() => render(
      html`<div title=${unsafeURL('data:text/plain,reviewed')}></div>`,
      document.createElement('div'),
    )).toThrow(/unsafeURL.*URL-valued attribute/i);
    expect(() => render(
      html`<div .textContent=${'destructive'}></div>`,
      document.createElement('div'),
    )).toThrow(/replaces renderer-owned DOM/i);
    expect(() => render(
      html`<select .value=${['a']}><option value="a">A</option></select>`,
      document.createElement('div'),
    )).toThrow(/requires a <select multiple>/i);
    expect(() => render(
      html`<img srcset=${'safe.png 1x, data:image/png;base64,AAAA 2x'}>`,
      document.createElement('div'),
    )).toThrow(/blocked unsafe URL protocol/i);
    expect(() => render(
      html`<a ping=${'/audit javascript:alert(1)'}>Ping</a>`,
      document.createElement('div'),
    )).toThrow(/blocked unsafe URL protocol/i);

    suspendRender(null);
    unmount(null);
  });

  it('recovers renderer-owned root and dynamic nodes after external DOM changes', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    const view = (label: string) => html`<button @click=${click}>${label}</button>`;

    render(view('first'), root);
    const detached = root.querySelector('button') as HTMLButtonElement;
    root.replaceChildren(document.createElement('aside'));
    render(view('second'), root);

    const replacement = root.querySelector('button') as HTMLButtonElement;
    expect(replacement).not.toBe(detached);
    expect(replacement.textContent).toBe('second');
    detached.click();
    replacement.click();
    expect(click).toHaveBeenCalledTimes(1);

    const dynamicRoot = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'owned';
    const dynamicView = () => html`<section>${strong}</section>`;
    render(dynamicView(), dynamicRoot);
    strong.remove();
    render(dynamicView(), dynamicRoot);
    expect(dynamicRoot.querySelector('strong')).toBe(strong);

    const attributeRoot = document.createElement('div');
    const attributeView = () => html`<button title=${'owned'} ?disabled=${true}>Owned</button>`;
    render(attributeView(), attributeRoot);
    const ownedButton = attributeRoot.querySelector('button') as HTMLButtonElement;
    ownedButton.removeAttribute('title');
    ownedButton.removeAttribute('disabled');
    render(attributeView(), attributeRoot);
    expect(ownedButton.title).toBe('owned');
    expect(ownedButton.disabled).toBe(true);
  });

  it('preserves null and undefined as explicit property values', () => {
    const root = document.createElement('div');
    const view = (value: null | undefined) => html`<div .payload=${value}></div>`;

    render(view(null), root);
    const target = root.querySelector('div') as HTMLDivElement & { payload?: unknown };
    expect(target.payload).toBeNull();
    render(view(undefined), root);
    expect(target.payload).toBeUndefined();
  });

  it('treats nothing as absent for direct and spread boolean attributes', () => {
    const root = document.createElement('div');
    render(html`
      <button id="direct" ?disabled=${nothing}>Direct</button>
      <button id="spread" ...=${{ '?disabled': nothing }}>Spread</button>
    `, root);

    expect((root.querySelector('#direct') as HTMLButtonElement).disabled).toBe(false);
    expect((root.querySelector('#spread') as HTMLButtonElement).disabled).toBe(false);
  });

  it('releases listener and ref ownership across repeated permanent unmounts', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    const detached: HTMLButtonElement[] = [];

    for (let index = 0; index < 100; index += 1) {
      const ref: { value?: Element } = {};
      render(html`<button ...=${{ ref, onClick: click }}>${index}</button>`, root);
      detached.push(ref.value as HTMLButtonElement);
      unmount(root);
      expect(ref.value).toBeUndefined();
    }

    for (const button of detached) button.click();
    expect(click).not.toHaveBeenCalled();
    expect(root.childNodes).toHaveLength(0);
  });

  it('removes capture listeners with their original options on unmount', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    const options: AddEventListenerOptions = { capture: true };
    render(html`<button @click=${event(click, options)}>Capture</button>`, root);
    const button = root.querySelector('button') as HTMLButtonElement;
    options.capture = false;

    unmount(root);
    button.click();

    expect(click).not.toHaveBeenCalled();
  });

  it('suspends Custom Element listeners and refs while retaining DOM for reconnect', async () => {
    const tagName = `gluon-lifecycle-${lifecycleElementSequence += 1}` as `${string}-${string}`;

    class LifecycleElement extends GluonElement {
      readonly click = vi.fn();
      readonly ref = vi.fn<(element: Element | undefined) => void>();

      protected override render() {
        return html`<button ...=${{ ref: this.ref, onClick: this.click }}>Retained</button>`;
      }
    }

    defineElement(tagName, LifecycleElement);
    const element = document.createElement(tagName) as LifecycleElement;
    document.body.append(element);
    await element.updateComplete;
    const button = element.shadowRoot?.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(element.click).toHaveBeenCalledOnce();

    element.remove();
    expect(element.ref).toHaveBeenLastCalledWith(undefined);
    button.click();
    expect(element.click).toHaveBeenCalledOnce();

    document.body.append(element);
    await element.updateComplete;
    const reconnected = element.shadowRoot?.querySelector('button') as HTMLButtonElement;
    expect(reconnected).toBe(button);
    expect(element.ref).toHaveBeenLastCalledWith(button);
    reconnected.click();
    expect(element.click).toHaveBeenCalledTimes(2);
  });

  it('does not commit a queued element update after disconnection', async () => {
    const tagName = `gluon-deferred-${lifecycleElementSequence += 1}` as `${string}-${string}`;

    class DeferredElement extends GluonElement {
      renders = 0;

      protected override render() {
        this.renders += 1;
        return html`<p>Rendered</p>`;
      }
    }

    defineElement(tagName, DeferredElement);
    const element = document.createElement(tagName) as DeferredElement;
    document.body.append(element);
    element.remove();
    await Promise.resolve();

    expect(element.renders).toBe(0);
    expect(element.shadowRoot?.childNodes).toHaveLength(0);

    document.body.append(element);
    await element.updateComplete;
    expect(element.renders).toBe(1);
    expect(element.shadowRoot?.textContent).toBe('Rendered');
  });
});
