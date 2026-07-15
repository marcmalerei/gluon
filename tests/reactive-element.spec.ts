import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  defineElement,
  html,
  setGluonRenderDebugHook,
  type GluonRenderDebugEvent,
  type PropertyDeclarations,
} from '../src/index.js';
import {
  nextTick,
  onScopeDispose,
  reactive,
  setReactivityErrorHandler,
  watchEffect,
} from '@gluonjs/reactivity';

let reactiveElementSequence = 0;

describe('reactive GluonElement rendering', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('tracks only render dependencies and batches synchronous writes', async () => {
    const tagName = `gluon-reactive-${reactiveElementSequence += 1}` as `${string}-${string}`;

    class ReactiveElement extends GluonElement {
      readonly state = reactive({ count: 0, visible: true, ignored: 0 });
      renders = 0;

      protected override render() {
        this.renders += 1;
        return html`<output>${this.state.visible ? this.state.count : 'hidden'}</output>`;
      }
    }

    defineElement(tagName, ReactiveElement);
    const element = document.createElement(tagName) as ReactiveElement;
    document.body.append(element);
    await element.updateComplete;
    expect(element.renders).toBe(1);
    expect(element.shadowRoot?.textContent).toBe('0');

    element.state.ignored = 1;
    await nextTick();
    expect(element.renders).toBe(1);

    element.state.count = 1;
    element.state.count = 2;
    element.state.count = 3;
    await element.updateComplete;
    expect(element.renders).toBe(2);
    expect(element.shadowRoot?.textContent).toBe('3');

    element.state.visible = false;
    await element.updateComplete;
    expect(element.renders).toBe(3);
    expect(element.shadowRoot?.textContent).toBe('hidden');

    element.state.count = 4;
    await nextTick();
    expect(element.renders).toBe(3);
  });

  it('stops scoped work on disconnect and recreates it while retaining state and DOM', async () => {
    const tagName = `gluon-scope-${reactiveElementSequence += 1}` as `${string}-${string}`;

    class ScopedElement extends GluonElement {
      readonly state = reactive({ count: 0, watched: 0 });
      readonly click = vi.fn();
      readonly buttonRef: { value?: Element } = {};
      renders = 0;
      watcherRuns = 0;
      scopeDisposals = 0;
      private watcherInstalled = false;

      override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.watcherInstalled = false;
      }

      protected override update(): void {
        if (!this.watcherInstalled) {
          this.watcherInstalled = true;
          watchEffect(() => {
            this.state.watched;
            this.watcherRuns += 1;
          });
          onScopeDispose(() => {
            this.scopeDisposals += 1;
          });
        }
        super.update();
      }

      protected override render() {
        this.renders += 1;
        return html`
          <button ...=${{ ref: this.buttonRef, onClick: this.click }}>${this.state.count}</button>
        `;
      }
    }

    defineElement(tagName, ScopedElement);
    const element = document.createElement(tagName) as ScopedElement;
    document.body.append(element);
    await element.updateComplete;
    const retainedButton = element.buttonRef.value as HTMLButtonElement;
    retainedButton.click();
    expect(element.click).toHaveBeenCalledOnce();
    expect(element.watcherRuns).toBe(1);

    element.state.count = 1;
    const cancelledUpdate = element.updateComplete;
    element.remove();
    await expect(cancelledUpdate).resolves.toBeUndefined();
    await nextTick();
    expect(element.renders).toBe(1);
    expect(element.scopeDisposals).toBe(1);
    expect(element.buttonRef.value).toBeUndefined();

    element.state.count = 2;
    element.state.watched = 1;
    await nextTick();
    retainedButton.click();
    expect(element.renders).toBe(1);
    expect(element.watcherRuns).toBe(1);
    expect(element.click).toHaveBeenCalledOnce();

    document.body.append(element);
    await element.updateComplete;
    expect(element.renders).toBe(2);
    expect(element.watcherRuns).toBe(2);
    expect(element.buttonRef.value).toBe(retainedButton);
    expect(retainedButton.textContent).toBe('2');
    retainedButton.click();
    expect(element.click).toHaveBeenCalledTimes(2);
  });

  it('rebuilds cached error routing after moving between connected boundaries', async () => {
    const childTag = `gluon-error-child-${reactiveElementSequence += 1}` as `${string}-${string}`;
    const boundaryTag = `gluon-error-boundary-${reactiveElementSequence += 1}` as `${string}-${string}`;
    const captured: string[] = [];

    class ErrorChild extends GluonElement {
      private failing = false;

      fail(): Promise<void> {
        this.failing = true;
        return this.requestUpdate();
      }

      recover(): void {
        this.failing = false;
      }

      protected override render() {
        if (this.failing) throw new Error('moved child failed');
        return html`<span>ready</span>`;
      }
    }

    class ErrorBoundary extends GluonElement {
      name = '';

      constructor() {
        super();
        this.onErrorCaptured(() => {
          captured.push(this.name);
          return true;
        });
      }

      protected override render() {
        return html`<slot></slot>`;
      }
    }

    defineElement(childTag, ErrorChild);
    defineElement(boundaryTag, ErrorBoundary);
    const first = document.createElement(boundaryTag) as ErrorBoundary;
    const second = document.createElement(boundaryTag) as ErrorBoundary;
    const child = document.createElement(childTag) as ErrorChild;
    first.name = 'first';
    second.name = 'second';
    first.append(child);
    document.body.append(first, second);
    await Promise.all([first.updateComplete, second.updateComplete, child.updateComplete]);

    await expect(child.fail()).rejects.toThrow('moved child failed');
    expect(captured).toEqual(['first']);

    child.recover();
    second.append(child);
    await child.updateComplete;
    await expect(child.fail()).rejects.toThrow('moved child failed');
    expect(captured).toEqual(['first', 'second']);
  });

  it('reports batched render causes, tracked dependencies, and timings', async () => {
    const tagName = `gluon-debug-${reactiveElementSequence += 1}` as `${string}-${string}`;
    const events: GluonRenderDebugEvent[] = [];
    const restore = setGluonRenderDebugHook((event) => events.push(event));

    class DebugElement extends GluonElement {
      static override readonly properties: PropertyDeclarations = {
        label: { default: 'initial' },
      };

      declare label: string;
      readonly state = reactive({ count: 0, ignored: 0 });

      protected override render() {
        return html`<output>${this.label}:${this.state.count}</output>`;
      }
    }

    try {
      defineElement(tagName, DebugElement);
      const element = document.createElement(tagName) as DebugElement;
      document.body.append(element);
      await element.updateComplete;

      expect(events).toHaveLength(1);
      expect(events[0]?.causes).toEqual([{ type: 'connection' }]);
      expect(events[0]?.dependencies.some((dependency) => dependency.key === 'count')).toBe(true);
      events.length = 0;

      element.state.count = 1;
      element.state.count = 2;
      element.label = 'updated';
      await element.updateComplete;

      expect(events).toHaveLength(1);
      const event = events[0] as GluonRenderDebugEvent;
      expect(event.element).toBe(element);
      expect(event.causes.filter((cause) => cause.type === 'reactive')).toHaveLength(2);
      expect(event.causes).toContainEqual(expect.objectContaining({
        type: 'property',
        name: 'label',
        value: 'updated',
        oldValue: 'initial',
      }));
      const reactiveCauses = event.causes.filter((cause) => cause.type === 'reactive');
      expect(reactiveCauses.every((cause) => cause.dependency.key === 'count')).toBe(true);
      expect(event.dependencies.some((dependency) => dependency.key === 'count')).toBe(true);
      expect(event.endedAt).toBeGreaterThanOrEqual(event.startedAt);
      expect(event.duration).toBe(event.endedAt - event.startedAt);
      expect(event.failed).toBe(false);
      expect(element.shadowRoot?.textContent).toBe('updated:2');

      events.length = 0;
      element.state.ignored = 1;
      await nextTick();
      expect(events).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it('reports failed renders without losing reactive recovery', async () => {
    const tagName = `gluon-failure-${reactiveElementSequence += 1}` as `${string}-${string}`;
    const diagnostics: GluonRenderDebugEvent[] = [];
    const reactiveErrors: unknown[] = [];
    const restoreDebug = setGluonRenderDebugHook((event) => diagnostics.push(event));
    const restoreErrors = setReactivityErrorHandler(({ error }) => {
      reactiveErrors.push(error);
    });

    class FailureElement extends GluonElement {
      readonly state = reactive({ fail: false });

      protected override render() {
        if (this.state.fail) throw new Error('render failed');
        return html`<p>recovered</p>`;
      }
    }

    try {
      defineElement(tagName, FailureElement);
      const element = document.createElement(tagName) as FailureElement;
      document.body.append(element);
      await element.updateComplete;
      diagnostics.length = 0;

      element.state.fail = true;
      await expect(element.updateComplete).rejects.toThrow('render failed');
      expect(reactiveErrors).toHaveLength(1);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toMatchObject({
        element,
        failed: true,
        error: expect.objectContaining({ message: 'render failed' }),
      });

      element.state.fail = false;
      await element.updateComplete;
      expect(element.shadowRoot?.textContent).toBe('recovered');
      expect(diagnostics.at(-1)?.failed).toBe(false);
    } finally {
      restoreErrors();
      restoreDebug();
    }
  });

  it('contains development observer failures without failing the render', async () => {
    const tagName = `gluon-debug-error-${reactiveElementSequence += 1}` as `${string}-${string}`;
    const reported = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('reportError', reported);
    const restore = setGluonRenderDebugHook(() => {
      throw new Error('observer failed');
    });

    class DebugErrorElement extends GluonElement {
      protected override render() {
        return html`<p>rendered</p>`;
      }
    }

    try {
      defineElement(tagName, DebugErrorElement);
      const element = document.createElement(tagName) as DebugErrorElement;
      document.body.append(element);
      await expect(element.updateComplete).resolves.toBeUndefined();
      expect(element.shadowRoot?.textContent).toBe('rendered');
      expect(reported).toHaveBeenCalledOnce();
      expect(reported.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
        message: 'observer failed',
      }));

      element.remove();
      vi.stubGlobal('reportError', undefined);
      document.body.append(element);
      await element.updateComplete;
      expect(consoleError).toHaveBeenCalledOnce();
      expect(consoleError.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
        message: 'observer failed',
      }));
    } finally {
      restore();
      consoleError.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('disables render diagnostics in production mode', async () => {
    const tagName = `gluon-production-${reactiveElementSequence += 1}` as `${string}-${string}`;
    const diagnostic = vi.fn();
    vi.stubGlobal('process', { env: { NODE_ENV: 'production' } });
    const restore = setGluonRenderDebugHook(diagnostic);

    class ProductionElement extends GluonElement {
      readonly state = reactive({ count: 0 });

      protected override render() {
        return html`<p>${this.state.count}</p>`;
      }
    }

    try {
      defineElement(tagName, ProductionElement);
      const element = document.createElement(tagName) as ProductionElement;
      document.body.append(element);
      await element.updateComplete;
      element.state.count = 1;
      await element.updateComplete;
      expect(element.shadowRoot?.textContent).toBe('1');
      expect(diagnostic).not.toHaveBeenCalled();
    } finally {
      restore();
      vi.unstubAllGlobals();
    }
  });
});
