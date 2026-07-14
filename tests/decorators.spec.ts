import { beforeEach, describe, expect, it } from 'vitest';
import { GluonElement, html } from '../src/index.js';
import { customElement, property, state } from '../src/decorators.js';

let decoratorElementSequence = 0;

describe('Gluon element decorators', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('registers a class and maps decorated fields and accessors to the property contract', async () => {
    const tagName = `gluon-decorated-${decoratorElementSequence += 1}` as `${string}-${string}`;

    @customElement(tagName)
    class DecoratedElement extends GluonElement {
      @property({ type: Boolean, reflect: true, default: false })
      isLoop!: boolean;

      @property({ type: Number, attribute: 'step-count', reflect: true, default: 1 })
      accessor stepCount = 2;

      @property({ type: String, reflect: true })
      label = 'ready';

      @state({ default: 'idle' })
      private status!: string;

      renders = 0;

      setStatus(value: string): void {
        this.status = value;
      }

      protected override render() {
        this.renders += 1;
        return html`<output>${this.isLoop}:${this.stepCount}:${this.label}:${this.status}</output>`;
      }
    }

    expect(customElements.get(tagName)).toBe(DecoratedElement);
    expect(DecoratedElement.observedAttributes).toEqual(expect.arrayContaining(['is-loop', 'step-count', 'label']));
    expect(DecoratedElement.observedAttributes).toHaveLength(3);

    const element = document.createElement(tagName) as DecoratedElement;
    document.body.append(element);
    await element.updateComplete;

    expect(element.isLoop).toBe(false);
    expect(element.stepCount).toBe(2);
    expect(element.label).toBe('ready');
    expect(element.hasAttribute('is-loop')).toBe(false);
    expect(element.getAttribute('step-count')).toBe('2');
    expect(element.getAttribute('label')).toBe('ready');
    expect(element.hasAttribute('status')).toBe(false);

    element.isLoop = true;
    element.stepCount = 4;
    element.setStatus('running');
    await element.updateComplete;

    expect(element.getAttribute('is-loop')).toBe('');
    expect(element.getAttribute('step-count')).toBe('4');
    expect(element.hasAttribute('status')).toBe(false);
    expect(element.shadowRoot?.textContent).toBe('true:4:ready:running');

    element.removeAttribute('is-loop');
    element.setAttribute('step-count', '7');
    await element.updateComplete;
    expect(element.isLoop).toBe(false);
    expect(element.stepCount).toBe(7);
  });

  it('inherits decorated declarations and lets a decorated subclass add its own property', () => {
    class DecoratedBase extends GluonElement {
      @property({ type: String, reflect: true, default: 'base' })
      baseLabel!: string;

      protected override render() {
        return html`<p>${this.baseLabel}</p>`;
      }
    }

    const tagName = `gluon-decorated-child-${decoratorElementSequence += 1}` as `${string}-${string}`;

    @customElement(tagName)
    class DecoratedChild extends DecoratedBase {
      @property({ type: Boolean, reflect: true, default: false })
      active!: boolean;
    }

    expect(DecoratedChild.observedAttributes).toEqual(['base-label', 'active']);
  });

  it('supports legacy TypeScript decorator calls with the same property behavior', async () => {
    const tagName = `gluon-legacy-decorated-${decoratorElementSequence += 1}` as `${string}-${string}`;

    class LegacyDecoratedElement extends GluonElement {
      declare active: boolean;

      protected override render() {
        return html`<output>${this.active}</output>`;
      }
    }

    property({ type: Boolean, reflect: true, default: false })(
      LegacyDecoratedElement.prototype,
      'active',
    );
    customElement(tagName)(LegacyDecoratedElement);

    const element = document.createElement(tagName) as LegacyDecoratedElement;
    document.body.append(element);
    element.active = true;
    await element.updateComplete;
    expect(element.hasAttribute('active')).toBe(true);
    expect(element.shadowRoot?.textContent).toBe('true');
  });

  it('rejects unsupported decorator targets with actionable errors', () => {
    const decorate = property();
    const call = (target: unknown, context: unknown) => Reflect.apply(decorate, undefined, [target, context]);
    const metadata = {};
    const baseContext = {
      kind: 'field',
      name: 'value',
      static: false,
      private: false,
      metadata,
      addInitializer: () => undefined,
    };

    expect(() => call(undefined, { ...baseContext, kind: 'method' })).toThrow('fields and auto-accessors');
    expect(() => call(undefined, { ...baseContext, static: true })).toThrow('static member');
    expect(() => call(undefined, { ...baseContext, private: true })).toThrow('#private');
    expect(() => call(undefined, { ...baseContext, metadata: undefined })).toThrow('metadata support');
    expect(() => call(undefined, { ...baseContext, name: Symbol('value') })).toThrow('string member name');
    expect(() => call(undefined, 42)).toThrow('instance field or auto-accessor');
    expect(() => call({}, 'value')).toThrow('GluonElement subclass');
    expect(() => call({}, Symbol('value'))).toThrow('string member name');

    const initializers: Array<(this: GluonElement) => void> = [];
    call(undefined, { ...baseContext, addInitializer: (initializer: (this: GluonElement) => void) => initializers.push(initializer) });
    initializers[0]!.call({} as GluonElement);

    class InvalidContextElement extends GluonElement {
      protected override render() { return html``; }
    }

    expect(() => Reflect.apply(customElement('invalid-context'), undefined, [
      InvalidContextElement,
      { kind: 'method', addInitializer: () => undefined },
    ])).toThrow('decorate only a class');
  });
});
