import { GluonElement, defineElement, html } from '@gluonjs/core';

export class GluonCounter extends GluonElement {
  count = 0;

  increment(): void {
    this.count += 1;
    this.emit('change', { value: this.count });
    void this.requestUpdate();
  }

  protected override render() {
    return html`<button type="button" @click=${() => this.increment()}>${this.count}</button>`;
  }
}

defineElement('gluon-counter', GluonCounter);
