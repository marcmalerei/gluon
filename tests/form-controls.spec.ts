import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  defineElement,
  html,
  render,
  type PropertyDeclarations,
} from '../src/index.js';

let formElementSequence = 0;

describe('form control integration', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('restores controlled text values and preserves uncontrolled user edits', () => {
    const root = document.createElement('div');
    const view = (value: string) => html`
      <input id="controlled" .value=${value}>
      <input id="uncontrolled" value=${'initial'}>
      <textarea id="controlled-area" .value=${value}></textarea>
      <textarea id="uncontrolled-area" .defaultValue=${'initial'}></textarea>
    `;

    render(view('controlled'), root);
    const controlled = root.querySelector('#controlled') as HTMLInputElement;
    const uncontrolled = root.querySelector('#uncontrolled') as HTMLInputElement;
    const controlledArea = root.querySelector('#controlled-area') as HTMLTextAreaElement;
    const uncontrolledArea = root.querySelector('#uncontrolled-area') as HTMLTextAreaElement;

    controlled.value = 'user';
    uncontrolled.value = 'user';
    controlledArea.value = 'user';
    uncontrolledArea.value = 'user';
    render(view('controlled'), root);

    expect(controlled.value).toBe('controlled');
    expect(controlledArea.value).toBe('controlled');
    expect(uncontrolled.value).toBe('user');
    expect(uncontrolledArea.value).toBe('user');
  });

  it('restores controlled checkbox and radio state while preserving uncontrolled state', () => {
    const root = document.createElement('div');
    const view = () => html`
      <input id="controlled-check" type="checkbox" .checked=${true}>
      <input id="uncontrolled-check" type="checkbox" ?checked=${true}>
      <input id="controlled-a" type="radio" name="controlled" .checked=${true}>
      <input id="controlled-b" type="radio" name="controlled" .checked=${false}>
      <input id="uncontrolled-a" type="radio" name="uncontrolled" ?checked=${true}>
      <input id="uncontrolled-b" type="radio" name="uncontrolled" ?checked=${false}>
    `;

    render(view(), root);
    const controlledCheck = root.querySelector('#controlled-check') as HTMLInputElement;
    const uncontrolledCheck = root.querySelector('#uncontrolled-check') as HTMLInputElement;
    const controlledA = root.querySelector('#controlled-a') as HTMLInputElement;
    const controlledB = root.querySelector('#controlled-b') as HTMLInputElement;
    const uncontrolledA = root.querySelector('#uncontrolled-a') as HTMLInputElement;
    const uncontrolledB = root.querySelector('#uncontrolled-b') as HTMLInputElement;

    controlledCheck.checked = false;
    uncontrolledCheck.checked = false;
    controlledB.click();
    uncontrolledB.click();
    render(view(), root);

    expect(controlledCheck.checked).toBe(true);
    expect(uncontrolledCheck.checked).toBe(false);
    expect(controlledA.checked).toBe(true);
    expect(controlledB.checked).toBe(false);
    expect(uncontrolledA.checked).toBe(false);
    expect(uncontrolledB.checked).toBe(true);
  });

  it('controls single and multi-select values and preserves an uncontrolled selection', () => {
    const root = document.createElement('div');
    const view = (single: string, multiple: readonly string[]) => html`
      <select id="single" .value=${single}>
        <option value="a">A</option>
        <option value="b">B</option>
        <option value="c">C</option>
      </select>
      <select id="multiple" multiple .value=${multiple}>
        <option value="a">A</option>
        <option value="b">B</option>
        <option value="c">C</option>
      </select>
      <select id="uncontrolled">
        <option value="a" ?selected=${true}>A</option>
        <option value="b" ?selected=${false}>B</option>
      </select>
    `;

    render(view('b', ['a', 'c']), root);
    const single = root.querySelector('#single') as HTMLSelectElement;
    const multiple = root.querySelector('#multiple') as HTMLSelectElement;
    const uncontrolled = root.querySelector('#uncontrolled') as HTMLSelectElement;

    single.value = 'a';
    for (const option of multiple.options) option.selected = option.value === 'b';
    uncontrolled.value = 'b';
    render(view('b', ['a', 'c']), root);

    expect(single.value).toBe('b');
    expect([...multiple.selectedOptions].map((option) => option.value)).toEqual(['a', 'c']);
    expect(uncontrolled.value).toBe('b');

    render(view('c', ['b']), root);
    expect(single.value).toBe('c');
    expect([...multiple.selectedOptions].map((option) => option.value)).toEqual(['b']);
  });

  it('commits controlled selection after dynamic options are rendered', () => {
    const root = document.createElement('div');
    const option = (value: string) => html`<option value=${value}>${value.toUpperCase()}</option>`;
    const view = (single: string, multiple: readonly string[], options: readonly string[]) => html`
      <select id="single" .value=${single}>${options.map(option)}</select>
      <select id="multiple" multiple ...=${{ '.value': multiple }}>${options.map(option)}</select>
    `;

    render(view('b', ['a', 'c'], ['a', 'b', 'c']), root);

    const single = root.querySelector('#single') as HTMLSelectElement;
    const multiple = root.querySelector('#multiple') as HTMLSelectElement;
    expect(single.value).toBe('b');
    expect([...multiple.selectedOptions].map((selected) => selected.value)).toEqual(['a', 'c']);

    render(view('d', ['b', 'd'], ['a', 'b', 'c', 'd']), root);
    expect(single.value).toBe('d');
    expect([...multiple.selectedOptions].map((selected) => selected.value)).toEqual(['b', 'd']);
  });

  it('preserves an uncontrolled file selection and only permits controlled clearing', () => {
    const root = document.createElement('div');
    const view = () => html`
      <input id="controlled" type="file" .value=${''}>
      <input id="uncontrolled" type="file">
    `;

    render(view(), root);
    const controlled = root.querySelector('#controlled') as HTMLInputElement;
    const uncontrolled = root.querySelector('#uncontrolled') as HTMLInputElement;
    const controlledTransfer = new DataTransfer();
    controlledTransfer.items.add(new File(['gluon'], 'controlled.txt', { type: 'text/plain' }));
    const uncontrolledTransfer = new DataTransfer();
    uncontrolledTransfer.items.add(new File(['gluon'], 'gluon.txt', { type: 'text/plain' }));
    controlled.files = controlledTransfer.files;
    uncontrolled.files = uncontrolledTransfer.files;

    render(view(), root);

    expect(controlled.files).toHaveLength(0);
    expect(uncontrolled.files?.item(0)?.name).toBe('gluon.txt');

    const invalidRoot = document.createElement('div');
    expect(() => render(
      html`<input type="file" .value=${'not-allowed'}>`,
      invalidRoot,
    )).toThrow();
  });

  it('supports the platform form-associated Custom Element contract', async () => {
    const tagName = `gluon-form-control-${formElementSequence += 1}` as `${string}-${string}`;

    class FormControlElement extends GluonElement {
      static readonly formAssociated = true;
      static override readonly properties: PropertyDeclarations = {
        value: { default: 'initial' },
        required: { type: Boolean, reflect: true, default: false },
      };

      declare value: string;
      declare required: boolean;
      readonly internals = this.attachInternals();
      private disabledByForm = false;

      get form(): HTMLFormElement | null {
        return this.internals.form;
      }

      get labels(): NodeList {
        return this.internals.labels;
      }

      checkValidity(): boolean {
        return this.internals.checkValidity();
      }

      formDisabledCallback(disabled: boolean): void {
        this.disabledByForm = disabled;
        void this.requestUpdate();
      }

      formResetCallback(): void {
        this.value = 'initial';
      }

      formStateRestoreCallback(state: string | File | FormData | null): void {
        if (typeof state === 'string') this.value = state;
      }

      override focus(options?: FocusOptions): void {
        this.shadowRoot?.querySelector('input')?.focus(options);
      }

      protected override update(): void {
        super.update();
        this.internals.setFormValue(this.value, this.value);
        if (this.required && !this.value) {
          this.internals.setValidity({ valueMissing: true }, 'A value is required.');
        } else {
          this.internals.setValidity({});
        }
      }

      protected override render() {
        return html`
          <input
            .value=${this.value}
            ?disabled=${this.disabledByForm}
            @input=${(inputEvent: Event) => {
              this.value = (inputEvent.currentTarget as HTMLInputElement).value;
            }}
          >
        `;
      }
    }

    defineElement(tagName, FormControlElement);
    const form = document.createElement('form');
    const label = document.createElement('label');
    label.htmlFor = 'control';
    label.textContent = 'Value';
    const control = document.createElement(tagName) as FormControlElement;
    control.id = 'control';
    control.setAttribute('name', 'entry');
    form.append(label, control);
    document.body.append(form);
    await control.updateComplete;

    control.value = 'submitted';
    await control.updateComplete;
    expect(new FormData(form).get('entry')).toBe('submitted');
    expect(control.form).toBe(form);
    expect([...control.labels]).toContain(label);

    const inputEvent = vi.fn();
    control.addEventListener('input', inputEvent);
    const internalInput = control.shadowRoot?.querySelector('input') as HTMLInputElement;
    internalInput.value = 'typed';
    internalInput.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await control.updateComplete;
    expect(control.value).toBe('typed');
    expect(new FormData(form).get('entry')).toBe('typed');
    expect(inputEvent).toHaveBeenCalledOnce();

    control.required = true;
    control.value = '';
    await control.updateComplete;
    expect(control.checkValidity()).toBe(false);

    form.reset();
    await control.updateComplete;
    expect(control.value).toBe('initial');
    control.formStateRestoreCallback('restored');
    await control.updateComplete;
    expect(control.value).toBe('restored');

    control.focus();
    expect(control.shadowRoot?.activeElement).toBe(control.shadowRoot?.querySelector('input'));

    control.setAttribute('disabled', '');
    await Promise.resolve();
    await control.updateComplete;
    expect(new FormData(form).has('entry')).toBe(false);
    expect((control.shadowRoot?.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });
});
