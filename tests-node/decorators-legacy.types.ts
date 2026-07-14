import { GluonElement, html } from '@gluonjs/core';
import {
  customElement,
  property,
  state,
  type StateDeclaration,
} from '@gluonjs/core/decorators';

const draftState = {
  default: 'idle',
  hasChanged: (value: string, oldValue: string | undefined) => value !== oldValue,
} satisfies StateDeclaration<string>;

@customElement('legacy-decorated-card')
class LegacyDecoratedCard extends GluonElement {
  @property({ type: Boolean, reflect: true })
  isLoop = false;

  @property({ type: Number, attribute: 'item-count', default: 1 })
  itemCount = 1;

  @state(draftState)
  private status = 'idle';

  protected override render() {
    return html`<p>${this.isLoop}:${this.itemCount}:${this.status}</p>`;
  }
}

const card = new LegacyDecoratedCard();
card.isLoop = true;
card.itemCount = 2;
// @ts-expect-error decorated public properties keep their declared TypeScript type
card.itemCount = 'invalid';
