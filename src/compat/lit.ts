import { GluonElement } from '../element.js';

/** The old values collected for one Gluon update pass. */
export type LitChangedProperties = ReadonlyMap<PropertyKey, unknown>;

/**
 * Optional Lit lifecycle naming for components being migrated to Gluon.
 *
 * The renderer, scheduler, connection scope, and error routing remain owned by
 * GluonElement. New components should prefer Gluon's native lifecycle hooks.
 */
export abstract class LitCompatElement<Events extends object = Record<string, unknown>>
  extends GluonElement<Events> {
  constructor() {
    super();
    this.onConnected(() => this.firstUpdated(this.changedProperties));
    this.onUpdated(() => this.updated(this.changedProperties));
  }

  /** Lit-compatible platform lifecycle entry point; always call `super`. */
  override connectedCallback(): void {
    super.connectedCallback();
  }

  /** Lit-compatible platform lifecycle entry point; always call `super`. */
  override disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  /**
   * Requests a Gluon update. The optional Lit arguments are accepted for
   * migration ergonomics; Gluon collects actual declared-property changes.
   */
  override requestUpdate(_name?: PropertyKey, _oldValue?: unknown): Promise<void> {
    return super.requestUpdate();
  }

  /** Runs before each Gluon render, including the first render of a connection. */
  protected willUpdate(_changedProperties: LitChangedProperties): void {}

  /** Runs once after the first successful render of each connection. */
  protected firstUpdated(_changedProperties: LitChangedProperties): void {}

  /** Runs after every successful Gluon render. */
  protected updated(_changedProperties: LitChangedProperties): void {}

  protected override update(): void {
    this.willUpdate(this.changedProperties);
    super.update();
  }
}
