import { afterEach, describe, expect, it } from 'vitest';
import {
  GluonElement,
  applyGluonElementHotUpdate,
  createApp,
  createGluonElementRegistry,
  createRegistryShadowRoot,
  createComponentStyleDependency,
  createStyleSheetOwner,
  css,
  defineGluonElement,
  defineAtom,
  html,
  render,
  refreshGluonApplications,
  refreshGluonElements,
} from '@gluonjs/core';
import { Button, buttonStyles, installUi } from '@gluonjs/atoms';
import { component as hotComponent, style as hotStyle } from '../packages/vite/src/client.js';
import { nextTick, ref } from '@gluonjs/reactivity';

afterEach(() => {
  document.body.replaceChildren();
});

describe('Gluon Core HMR bridge', () => {
  it('retains generated starter state while hot-updating app tokens and the Atom consumer', async () => {
    const moduleId = `/create-gluon-ui-${Date.now()}.ts`;
    const tokenSheet = hotStyle(css`@layer starter { .starter-action { --gluon-button-background: rgb(200, 255, 0); } }`, moduleId, 'starterStyles');
    const uiOwner = installUi(document, { theme: 'light' });
    const appStyles = createStyleSheetOwner(document);
    appStyles.retain(tokenSheet);
    const count = ref(0);
    const InitialAction = hotComponent(defineAtom(
      ({ value, increment }: { value: number; increment: () => void }) => Button({
        label: `Actions: ${value}`,
        onClick: increment,
        attributes: { class: 'starter-action' },
      }),
      'StarterAction',
    ), moduleId, 'StarterAction');
    const container = document.createElement('main');
    document.body.append(container);
    const app = createApp(() => InitialAction({
      value: count.value,
      increment: () => { count.value += 1; },
    }));
    app.onUnmounted(() => {
      appStyles.dispose();
      uiOwner.dispose();
    });
    const mounted = app.mount(container);
    const button = container.querySelector<HTMLButtonElement>('button')!;
    button.click();
    await nextTick();
    expect(button.textContent).toBe('Actions: 1');
    expect(document.adoptedStyleSheets).toContain(buttonStyles);

    const updatedSheet = hotStyle(css`@layer starter { .starter-action { --gluon-button-background: rgb(23, 63, 145); } }`, moduleId, 'starterStyles');
    hotComponent(defineAtom(
      ({ value, increment }: { value: number; increment: () => void }) => Button({
        label: `Updated actions: ${value}`,
        onClick: increment,
        attributes: { class: 'starter-action' },
      }),
      'StarterAction',
    ), moduleId, 'StarterAction');
    refreshGluonApplications();
    await nextTick();

    expect(updatedSheet).toBe(tokenSheet);
    expect(container.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('Updated actions: 1');
    expect(getComputedStyle(button).backgroundColor).toBe('rgb(23, 63, 145)');
    mounted.unmount();
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
    expect(document.adoptedStyleSheets).not.toContain(tokenSheet);
  });

  it('updates functional component CSS in place while retaining owner counts', () => {
    const moduleId = `/component-style-${Date.now()}.ts`;
    const initialSheet = hotStyle(css`@layer atoms { .hot-style { color: rgb(1, 2, 3); } }`, moduleId, 'styles');
    const Initial = hotComponent(defineAtom(
      () => html`<p class="hot-style">Stable</p>`,
      'HotStyle',
      [createComponentStyleDependency({
        id: 'gluon-test-hot-style',
        sheet: initialSheet,
        layer: 'atom',
        order: 99,
        scope: 'gluon-component',
      })],
    ), moduleId, 'component');
    render(Initial({}), document.body);
    const adopted = document.adoptedStyleSheets.find((sheet) => sheet === initialSheet);
    expect(adopted).toBe(initialSheet);

    const updatedSheet = hotStyle(css`@layer atoms { .hot-style { color: rgb(4, 5, 6); } }`, moduleId, 'styles');
    hotComponent(defineAtom(
      () => html`<p class="hot-style">Updated</p>`,
      'HotStyle',
      [createComponentStyleDependency({
        id: 'gluon-test-hot-style',
        sheet: updatedSheet,
        layer: 'atom',
        order: 99,
        scope: 'gluon-component',
      })],
    ), moduleId, 'component');
    render(Initial({}), document.body);
    expect(updatedSheet).toBe(initialSheet);
    expect(document.adoptedStyleSheets.filter((sheet) => sheet === initialSheet)).toHaveLength(1);
    expect([...initialSheet.cssRules].map((rule) => rule.cssText).join(' ')).toContain('rgb(4, 5, 6)');
    expect(document.body.textContent).toBe('Updated');
  });

  it('keeps the registered constructor, instance state, and adopted sheet identity', async () => {
    const initialSheet = css`:host { color: rgb(1, 2, 3); }`;
    class InitialCounter extends GluonElement {
      static override readonly properties = { count: Number, label: String };
      static override readonly styles = initialSheet;
      declare count: number;
      declare label: string;
      legacyMethod() { return 'legacy'; }
      protected override render() { return html`<p>Initial ${this.count}</p>`; }
    }
    const initial = applyGluonElementHotUpdate('gluon-core-hot-counter', InitialCounter);
    const repeated = applyGluonElementHotUpdate('gluon-core-hot-counter', InitialCounter);
    expect(repeated.constructor).toBe(initial.constructor);
    const element = document.createElement('gluon-core-hot-counter') as InitialCounter;
    element.count = 4;
    document.body.append(element);
    await element.updateComplete;
    const adopted = element.shadowRoot!.adoptedStyleSheets[0]!;

    const nextSheet = css`:host { color: rgb(4, 5, 6); }`;
    class UpdatedCounter extends GluonElement {
      static override readonly properties = { count: Number, label: String };
      static override readonly styles = nextSheet;
      declare count: number;
      protected override render() { return html`<p>Updated ${this.count}</p>`; }
    }
    const updated = applyGluonElementHotUpdate('gluon-core-hot-counter', UpdatedCounter);
    expect(updated).toEqual({ compatible: true, constructor: InitialCounter });
    await element.updateComplete;
    expect(customElements.get('gluon-core-hot-counter')).toBe(InitialCounter);
    expect(element.shadowRoot!.textContent).toBe('Updated 4');
    expect(element.shadowRoot!.adoptedStyleSheets[0]).toBe(adopted);
    expect([...adopted.cssRules].map((rule) => rule.cssText).join(' ')).toContain('rgb(4, 5, 6)');
    expect('legacyMethod' in InitialCounter.prototype).toBe(false);
  });

  it('reruns functional setup while retaining host, local state, form state, DOM, and sheet identity', async () => {
    const initialSheet = css`:host { color: rgb(10, 20, 30); }`;
    const initialCleanup: string[] = [];
    const InitialQuantity = defineGluonElement({
      tagName: 'gluon-functional-hot-quantity',
      formAssociated: true,
      properties: { value: { type: Number, reflect: true, default: 1 } },
      styles: initialSheet,
      setup(context) {
        const quantity = context.state('quantity', context.props.value);
        context.onCleanup(() => initialCleanup.push('initial'));
        context.onUpdated(() => context.form.setValue(String(quantity.value)));
        return {
          expose: { increment: () => { quantity.value += 1; } },
          render: () => html`<output>Initial ${quantity.value}</output>`,
        };
      },
    }, { register: false });
    const initial = applyGluonElementHotUpdate('gluon-functional-hot-quantity', InitialQuantity);
    const element = document.createElement('gluon-functional-hot-quantity') as InstanceType<typeof InitialQuantity>;
    element.setAttribute('name', 'quantity');
    const form = document.createElement('form');
    form.append(element);
    document.body.append(form);
    await element.updateComplete;
    element.increment();
    await element.updateComplete;
    const output = element.shadowRoot?.querySelector('output');
    const shadowRoot = element.shadowRoot;
    const adopted = element.shadowRoot?.adoptedStyleSheets[0];
    expect(output?.textContent).toBe('Initial 2');
    expect(new FormData(form).get('quantity')).toBe('2');

    const nextSheet = css`:host { color: rgb(30, 40, 50); }`;
    const UpdatedQuantity = defineGluonElement({
      tagName: 'gluon-functional-hot-quantity',
      formAssociated: true,
      properties: { value: { type: Number, reflect: true, default: 1 } },
      styles: nextSheet,
      setup(context) {
        const quantity = context.state('quantity', context.props.value);
        context.onUpdated(() => context.form.setValue(String(quantity.value)));
        return {
          expose: { increment: () => { quantity.value += 2; } },
          render: () => html`<output>Updated ${quantity.value}</output>`,
        };
      },
    }, { register: false });
    const updated = applyGluonElementHotUpdate('gluon-functional-hot-quantity', UpdatedQuantity);
    expect(updated).toEqual({ compatible: true, constructor: initial.constructor });
    await element.updateComplete;
    expect(initialCleanup).toEqual(['initial']);
    expect(element.shadowRoot).toBe(shadowRoot);
    expect(element.shadowRoot?.querySelector('output')?.textContent).toBe('Updated 2');
    expect(element.shadowRoot?.adoptedStyleSheets[0]).toBe(adopted);
    expect([...adopted!.cssRules].map((rule) => rule.cssText).join(' ')).toContain('rgb(30, 40, 50)');
    expect(new FormData(form).get('quantity')).toBe('2');
    element.increment();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('output')?.textContent).toBe('Updated 4');
  });

  it('keeps scoped functional registrations inside their selected HMR registry', async () => {
    const registry = createGluonElementRegistry();
    const Initial = defineGluonElement({
      tagName: 'gluon-scoped-hot-status',
      setup() {
        return { render: () => html`<p>Initial scoped status</p>` };
      },
    }, { register: false });
    applyGluonElementHotUpdate('gluon-scoped-hot-status', Initial, { registry });
    const host = document.createElement('section');
    document.body.append(host);
    const root = createRegistryShadowRoot(host, registry);
    render(html`<gluon-scoped-hot-status></gluon-scoped-hot-status>`, root);
    const element = root.querySelector('gluon-scoped-hot-status') as InstanceType<typeof Initial>;
    await element.updateComplete;

    const Updated = defineGluonElement({
      tagName: 'gluon-scoped-hot-status',
      setup() {
        return { render: () => html`<p>Updated scoped status</p>` };
      },
    }, { register: false });
    const result = applyGluonElementHotUpdate('gluon-scoped-hot-status', Updated, { registry });
    await element.updateComplete;
    expect(result.constructor).toBe(Initial);
    expect(element.shadowRoot?.textContent).toContain('Updated scoped status');
    expect(registry.get('gluon-scoped-hot-status')).toBe(Initial);
    if (registry.scoped) expect(customElements.get('gluon-scoped-hot-status')).toBeUndefined();
  });

  it('surfaces incompatible superclass, form, schema, and sheet-list edits', () => {
    class StableElement extends GluonElement {
      static override readonly properties = { value: String };
      protected override render() { return html`Stable`; }
    }
    applyGluonElementHotUpdate('gluon-core-hot-schema', StableElement);

    class ChangedBase extends GluonElement {
      protected override render() { return html`Base`; }
    }
    class ChangedSuperclass extends ChangedBase {
      static override readonly properties = { value: String };
    }
    expect(applyGluonElementHotUpdate('gluon-core-hot-schema', ChangedSuperclass))
      .toEqual(expect.objectContaining({ compatible: false, reason: 'the Custom Element superclass changed' }));

    class ChangedForm extends GluonElement {
      static readonly formAssociated = true;
      static override readonly properties = { value: String };
      protected override render() { return html`Form`; }
    }
    expect(applyGluonElementHotUpdate('gluon-core-hot-schema', ChangedForm))
      .toEqual(expect.objectContaining({ compatible: false, reason: 'the form-associated contract changed' }));

    class ChangedSchema extends GluonElement {
      static override readonly properties = { value: Number };
      protected override render() { return html`Schema`; }
    }
    expect(applyGluonElementHotUpdate('gluon-core-hot-schema', ChangedSchema))
      .toEqual(expect.objectContaining({ compatible: false, reason: 'the public property or attribute schema changed' }));

    class ChangedSheets extends GluonElement {
      static override readonly properties = { value: String };
      static override readonly styles = [css`:host { color: red; }`, css`:host { display: block; }`];
      protected override render() { return html`Sheets`; }
    }
    expect(applyGluonElementHotUpdate('gluon-core-hot-schema', ChangedSheets))
      .toEqual(expect.objectContaining({
        compatible: false,
        reason: 'the number of adopted component stylesheets changed',
      }));
  });

  it('rejects registration owned outside the HMR bridge', () => {
    class ExternalElement extends HTMLElement {}
    customElements.define('gluon-external-hot-owner', ExternalElement);
    class GluonReplacement extends GluonElement {
      protected override render() { return html`Replacement`; }
    }
    expect(() => applyGluonElementHotUpdate('gluon-external-hot-owner', GluonReplacement))
      .toThrow('already defined outside Gluon HMR');

    class AlreadyRegistered extends GluonElement {
      protected override render() { return html`Registered`; }
    }
    customElements.define('gluon-existing-hot-owner', AlreadyRegistered);
    expect(applyGluonElementHotUpdate('gluon-existing-hot-owner', AlreadyRegistered))
      .toEqual({ compatible: true, constructor: AlreadyRegistered });
  });

  it('refreshes mounted applications and connected elements without remounting', async () => {
    let applicationLabel = 'Before';
    const container = document.createElement('main');
    document.body.append(container);
    const app = createApp(() => html`<h1>${applicationLabel}</h1>`);
    const mount = app.mount(container);

    let elementLabel = 'Before';
    class RefreshElement extends GluonElement {
      protected override render() { return html`<p>${elementLabel}</p>`; }
    }
    applyGluonElementHotUpdate('gluon-core-hot-refresh', RefreshElement);
    const element = document.createElement('gluon-core-hot-refresh') as RefreshElement;
    document.body.append(element);
    await element.updateComplete;

    applicationLabel = 'After';
    elementLabel = 'After';
    refreshGluonApplications();
    refreshGluonElements();
    await nextTick();
    await element.updateComplete;
    expect(container.textContent).toBe('After');
    expect(element.shadowRoot!.textContent).toBe('After');
    mount.unmount();
    refreshGluonApplications();
    element.remove();
    refreshGluonElements();
  });
});
