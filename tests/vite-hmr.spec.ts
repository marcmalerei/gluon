import { afterEach, describe, expect, it } from 'vitest';
import {
  GluonElement,
  applyGluonElementHotUpdate,
  createApp,
  css,
  html,
  refreshGluonApplications,
  refreshGluonElements,
} from '@gluonjs/core';
import { nextTick } from '@gluonjs/reactivity';

afterEach(() => {
  document.body.replaceChildren();
});

describe('Gluon Core HMR bridge', () => {
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
