import {
  GluonElement,
  css,
  defineElement,
  html,
  type EventDeclarations,
  type PropertyDeclarations,
  type TemplateResult,
  type TemplateValue,
} from '@gluonjs/core';
import {
  applySchemaDefaults,
  cloneJson,
  freezeJson,
  getJsonFormFields,
  isJsonFormsUiSchema,
  isJsonObject,
  isJsonSchema,
  validateJsonFormData,
  type JsonFormField,
  type JsonFormValidationError,
  type JsonFormsUiSchema,
  type JsonObject,
  type JsonSchema,
  type JsonValue,
} from './schema.js';

/** The registered custom-element name. */
export const jsonFormsTag = 'gluon-json-form';

/** Detail emitted when a person changes a field. */
export interface JsonFormChangeDetail {
  readonly data: JsonObject;
  readonly errors: readonly JsonFormValidationError[];
}

/** Detail emitted only when the validation result changes. */
export interface JsonFormValidationChangeDetail {
  readonly valid: boolean;
  readonly errors: readonly JsonFormValidationError[];
}

/** Typed event map for {@link JsonFormsElement}. */
export interface JsonFormsEvents {
  readonly change: JsonFormChangeDetail;
  readonly 'validation-change': JsonFormValidationChangeDetail;
}

interface JsonFormsProperties {
  readonly schema: JsonSchema;
  readonly uischema: JsonFormsUiSchema | undefined;
  readonly data: JsonObject;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

/** Properties accepted by the {@link JsonForm} Gluon render helper. */
export interface JsonFormOptions {
  readonly schema: JsonSchema;
  readonly uischema?: JsonFormsUiSchema;
  readonly data?: JsonObject;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onChange?: (event: CustomEvent<JsonFormChangeDetail>) => void;
  readonly onValidationChange?: (event: CustomEvent<JsonFormValidationChangeDetail>) => void;
}

const emptySchema: JsonSchema = Object.freeze({
  type: 'object',
  properties: Object.freeze({}),
} satisfies JsonSchema);

const jsonFormsStyles = css`
  :host { display: block; color: var(--gluon-json-form-ink, #101820); font: inherit; }
  *, *::before, *::after { box-sizing: border-box; }
  .form { display: grid; gap: 20px; }
  .heading { display: grid; gap: 6px; padding-bottom: 4px; border-bottom: 1px solid var(--gluon-json-form-rule, #c9d2d8); }
  h2, p { margin: 0; }
  h2 { font-size: 1.35rem; line-height: 1.15; letter-spacing: -0.02em; }
  .description, .field-description { color: var(--gluon-json-form-muted, #52616b); line-height: 1.45; }
  .fields { display: grid; gap: 16px; }
  fieldset { min-inline-size: 0; margin: 0; padding: 16px; border: 1px solid var(--gluon-json-form-rule, #c9d2d8); display: grid; gap: 16px; }
  legend { padding: 0 6px; font-weight: 700; }
  .array-items { display: grid; gap: 14px; }
  .array-item { display: grid; gap: 12px; padding: 14px; border-inline-start: 3px solid var(--gluon-json-form-accent, #496900); background: color-mix(in srgb, var(--gluon-json-form-surface, #ffffff) 92%, var(--gluon-json-form-accent, #496900)); }
  .array-actions { display: flex; flex-wrap: wrap; gap: 10px; }
  button { min-block-size: 44px; border: 1px solid var(--gluon-json-form-border, #7d8a92); padding: 8px 12px; background: var(--gluon-json-form-surface, #ffffff); color: inherit; font: inherit; cursor: pointer; }
  button:focus-visible { outline: 3px solid var(--gluon-json-form-focus, #005fcc); outline-offset: 2px; }
  button:disabled { cursor: not-allowed; opacity: .62; }
  .field { display: grid; gap: 7px; }
  .field-label { font-weight: 650; line-height: 1.3; }
  .required { color: var(--gluon-json-form-accent, #496900); }
  input, select {
    min-block-size: 44px;
    inline-size: 100%;
    border: 1px solid var(--gluon-json-form-border, #7d8a92);
    border-radius: 4px;
    background: var(--gluon-json-form-surface, #ffffff);
    color: inherit;
    padding: 9px 11px;
    font: inherit;
  }
  input[type="checkbox"] { min-block-size: 20px; inline-size: 20px; padding: 0; accent-color: var(--gluon-json-form-accent, #496900); }
  .checkbox-label { display: flex; align-items: center; gap: 10px; min-block-size: 44px; font-weight: 650; }
  input:focus-visible, select:focus-visible { outline: 3px solid var(--gluon-json-form-focus, #005fcc); outline-offset: 2px; }
  input[aria-invalid="true"], select[aria-invalid="true"] { border-color: var(--gluon-json-form-error, #b42318); }
  input:disabled, select:disabled { cursor: not-allowed; opacity: 0.62; }
  .error { color: var(--gluon-json-form-error, #b42318); font-weight: 600; line-height: 1.4; }
  .configuration-error { border-inline-start: 3px solid var(--gluon-json-form-error, #b42318); padding-inline-start: 10px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; } }
`;

/**
 * A form-associated Custom Element that renders the supported object, nested
 * object, and bounded array JSON Forms subset through native controls.
 */
export class JsonFormsElement extends GluonElement<JsonFormsEvents> {
  static readonly formAssociated = true;

  static override readonly events = {
    change: {},
    'validation-change': {},
  } satisfies EventDeclarations<JsonFormsEvents>;

  static override readonly properties = {
    schema: {
      attribute: false,
      default: () => emptySchema,
      validate: (value: unknown) => isJsonSchema(value) || 'schema must be a JSON Schema object',
    },
    uischema: {
      attribute: false,
      validate: (value: unknown) => value === undefined || isJsonFormsUiSchema(value) || 'uischema must be a JSON Forms UI schema',
    },
    data: {
      attribute: false,
      default: () => Object.freeze({}) as JsonObject,
      validate: (value: unknown) => isJsonObject(value) || 'data must be a JSON object',
    },
    disabled: { type: Boolean, reflect: true, default: false },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true, default: false },
  } satisfies PropertyDeclarations<JsonFormsProperties>;

  static override readonly styles = jsonFormsStyles;

  declare schema: JsonSchema;
  declare uischema: JsonFormsUiSchema | undefined;
  declare data: JsonObject;
  declare disabled: boolean;
  declare readOnly: boolean;

  private readonly internals = typeof this.attachInternals === 'function'
    ? this.attachInternals()
    : undefined;
  private currentData: JsonObject = Object.freeze({});
  private initialData: JsonObject | undefined;
  private observedSchema: JsonSchema | undefined;
  private observedUiSchema: JsonFormsUiSchema | undefined;
  private observedData: JsonObject | undefined;
  private validationErrors: readonly JsonFormValidationError[] = Object.freeze([]);
  private validationSignature = '';
  private disabledByForm = false;

  get form(): HTMLFormElement | null {
    return this.internals?.form ?? null;
  }

  get labels(): NodeList {
    return this.internals?.labels ?? [] as unknown as NodeList;
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
  }

  get type(): string {
    return jsonFormsTag;
  }

  get value(): string {
    return JSON.stringify(this.currentData);
  }

  set value(value: string) {
    const parsed = parseJsonObject(value);
    if (parsed) this.restoreData(parsed);
  }

  get errors(): readonly JsonFormValidationError[] {
    return this.validationErrors;
  }

  get validity(): ValidityState | undefined {
    return this.internals?.validity;
  }

  get validationMessage(): string {
    return this.internals?.validationMessage ?? this.validationErrors[0]?.message ?? '';
  }

  get willValidate(): boolean {
    if (this.disabled || this.disabledByForm) return false;
    return this.internals?.willValidate ?? true;
  }

  checkValidity(): boolean {
    return this.internals?.checkValidity() ?? this.validationErrors.length === 0;
  }

  reportValidity(): boolean {
    return this.internals?.reportValidity() ?? this.validationErrors.length === 0;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabledByForm = disabled;
    void this.requestUpdate();
  }

  formResetCallback(): void {
    this.restoreData(this.initialData ?? Object.freeze({}));
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    const parsed = parseJsonObject(state);
    if (parsed) this.restoreData(parsed);
  }

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')?.focus(options);
  }

  protected override update(): void {
    const validationChanged = this.synchronizeExternalProperties();
    super.update();
    this.synchronizeFormState();
    if (validationChanged) this.emitValidationChange();
  }

  protected override render(): TemplateResult {
    const fields = getJsonFormFields(this.schema, this.uischema);
    const configurationErrors = this.validationErrors.filter((error) => error.keyword === 'unsupported' || error.keyword === 'schema' || error.keyword === 'type');
    const title = this.schema.title;
    const disabled = this.disabled || this.disabledByForm;
    return html`
      <section class="form" part="form" aria-label=${title ?? 'Schema form'}>
        ${title || this.schema.description ? html`
          <header class="heading">
            ${title ? html`<h2 part="title">${title}</h2>` : ''}
            ${this.schema.description ? html`<p class="description" part="description">${this.schema.description}</p>` : ''}
          </header>
        ` : ''}
        ${configurationErrors.length > 0 ? html`
          <div class="error configuration-error" part="configuration-error" role="alert">
            ${configurationErrors.map((error) => html`<p>${error.message}</p>`)}
          </div>
        ` : html`
          <div class="fields" part="fields">
            ${fields.map((field) => this.renderField(field, disabled))}
          </div>
        `}
      </section>
    `;
  }

  private renderField(field: JsonFormField, disabled: boolean): TemplateValue {
    const id = fieldId(field.path);
    const errors = this.errorsForPath(field.path, field.kind === 'object' || field.kind === 'array');
    const errorId = `${id}-error`;
    const descriptionId = field.description ? `${id}-description` : undefined;
    const describedBy = [descriptionId, errors.length > 0 ? errorId : undefined].filter(Boolean).join(' ') || undefined;
    const fieldDisabled = disabled || field.readOnly;
    if (field.kind === 'object') {
      return html`
        <fieldset class="group" part=${`field field-${id}`}>
          <legend>${field.label}${field.required ? html` <span class="required" aria-hidden="true">*</span>` : ''}</legend>
          ${field.description ? html`<p id=${descriptionId!} class="field-description">${field.description}</p>` : ''}
          <div class="fields">${(field.children ?? []).map((child) => this.renderField(child, fieldDisabled))}</div>
          ${this.renderErrors(errors, errorId)}
        </fieldset>
      `;
    }
    if (field.kind === 'array') {
      const value = getJsonPath(this.currentData, field.path);
      const items = Array.isArray(value) ? value : [];
      const itemTemplate = field.item;
      return html`
        <fieldset class="group array" part=${`field field-${id}`}>
          <legend>${field.label}${field.required ? html` <span class="required" aria-hidden="true">*</span>` : ''}</legend>
          ${field.description ? html`<p id=${descriptionId!} class="field-description">${field.description}</p>` : ''}
          <div class="array-items">
            ${items.map((_, index) => itemTemplate
              ? html`<div class="array-item">${this.renderField(rebaseField(itemTemplate, [...field.path, String(index)], `Item ${index + 1}`), fieldDisabled)}<button type="button" ?disabled=${fieldDisabled || items.length <= (field.schema.minItems ?? 0)} @click=${() => this.removeArrayItem(field.path, index)}>Remove item ${index + 1}</button></div>`
              : '')}
          </div>
          <div class="array-actions"><button type="button" ?disabled=${fieldDisabled || (field.schema.maxItems !== undefined && items.length >= field.schema.maxItems)} @click=${() => this.addArrayItem(field)}>Add item</button></div>
          ${this.renderErrors(errors, errorId)}
        </fieldset>
      `;
    }
    if (field.kind === 'boolean') {
      return html`
        <div class="field" part=${`field field-${id}`}>
          <label class="checkbox-label" for=${id}>
            <input
              id=${id}
              type="checkbox"
              .checked=${getJsonPath(this.currentData, field.path) === true}
              ?disabled=${fieldDisabled}
              aria-describedby=${describedBy}
              aria-invalid=${errors.length > 0 ? 'true' : 'false'}
              aria-errormessage=${errors.length > 0 ? errorId : undefined}
              @change=${(event: Event) => this.commitPath(field.path, (event.currentTarget as HTMLInputElement).checked)}
            >
            <span>${field.label}${field.required ? html` <span class="required" aria-hidden="true">*</span>` : ''}</span>
          </label>
          ${field.description ? html`<p id=${descriptionId!} class="field-description">${field.description}</p>` : ''}
          ${this.renderErrors(errors, errorId)}
        </div>
      `;
    }
    const label = html`<label class="field-label" for=${id}>${field.label}${field.required ? html` <span class="required" aria-hidden="true">*</span>` : ''}</label>`;
    return html`
      <div class="field" part=${`field field-${id}`}>
        ${label}
        ${field.kind === 'select'
          ? this.renderSelect(field, id, fieldDisabled, describedBy, errorId, errors.length > 0)
          : this.renderInput(field, id, fieldDisabled, describedBy, errorId, errors.length > 0)}
        ${field.description ? html`<p id=${descriptionId!} class="field-description">${field.description}</p>` : ''}
        ${this.renderErrors(errors, errorId)}
      </div>
    `;
  }

  private renderInput(
    field: JsonFormField,
    id: string,
    disabled: boolean,
    describedBy: string | undefined,
    errorId: string,
    invalid: boolean,
  ): TemplateValue {
    const value = getJsonPath(this.currentData, field.path);
    const isNumber = field.kind === 'number';
    return html`
      <input
        id=${id}
        type=${isNumber ? 'number' : field.schema.format === 'email' ? 'email' : 'text'}
        .value=${typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        ?required=${field.required}
        ?disabled=${disabled}
        ?readonly=${field.readOnly}
        minlength=${field.schema.minLength ?? undefined}
        maxlength=${field.schema.maxLength ?? undefined}
        min=${field.schema.minimum ?? undefined}
        max=${field.schema.maximum ?? undefined}
        step=${field.schema.type === 'integer' ? '1' : 'any'}
        aria-describedby=${describedBy}
        aria-invalid=${invalid ? 'true' : 'false'}
        aria-errormessage=${invalid ? errorId : undefined}
        @input=${(event: Event) => {
          const input = event.currentTarget as HTMLInputElement;
          if (!isNumber) this.commitPath(field.path, input.value === '' ? undefined : input.value);
          else this.commitPath(field.path, input.value === '' || Number.isNaN(input.valueAsNumber) ? undefined : input.valueAsNumber);
        }}
      >
    `;
  }

  private renderSelect(
    field: JsonFormField,
    id: string,
    disabled: boolean,
    describedBy: string | undefined,
    errorId: string,
    invalid: boolean,
  ): TemplateValue {
    const selectedIndex = field.options.findIndex((option) => Object.is(option.value, getJsonPath(this.currentData, field.path)));
    return html`
      <select
        id=${id}
        .value=${selectedIndex >= 0 ? String(selectedIndex) : ''}
        ?required=${field.required}
        ?disabled=${disabled}
        aria-describedby=${describedBy}
        aria-invalid=${invalid ? 'true' : 'false'}
        aria-errormessage=${invalid ? errorId : undefined}
        @change=${(event: Event) => {
          const index = Number((event.currentTarget as HTMLSelectElement).value);
          const option = field.options[index];
          this.commitPath(field.path, option?.value);
        }}
      >
        <option value="" ?selected=${selectedIndex < 0}>${field.required ? 'Select an option' : 'No selection'}</option>
        ${field.options.map((option, index) => html`<option value=${String(index)}>${option.label}</option>`)}
      </select>
    `;
  }

  private renderErrors(errors: readonly JsonFormValidationError[], id: string): TemplateValue {
    return errors.length === 0 ? '' : html`
      <div id=${id} class="error" part="error" role="alert">
        ${errors.map((error) => html`<p>${error.message}</p>`)}
      </div>
    `;
  }

  private synchronizeExternalProperties(): boolean {
    if (
      this.schema === this.observedSchema
      && this.uischema === this.observedUiSchema
      && this.data === this.observedData
    ) return false;
    this.observedSchema = this.schema;
    this.observedUiSchema = this.uischema;
    const normalized = applySchemaDefaults(this.schema, this.data);
    this.currentData = normalized;
    this.data = normalized;
    this.observedData = normalized;
    this.initialData ??= cloneJson(normalized);
    return this.refreshValidation();
  }

  private commitPath(path: readonly string[], value: JsonValue | undefined): void {
    if (this.disabled || this.disabledByForm || this.readOnly) return;
    this.currentData = updateJsonPath(this.currentData, path, value);
    this.data = this.currentData;
    this.observedData = this.currentData;
    const validationChanged = this.refreshValidation();
    this.emit('change', this.changeDetail());
    if (validationChanged) this.emitValidationChange();
  }

  private addArrayItem(field: JsonFormField): void {
    if (this.disabled || this.disabledByForm || this.readOnly) return;
    const current = getJsonPath(this.currentData, field.path);
    const items = Array.isArray(current) ? [...current] : [];
    if (field.schema.maxItems !== undefined && items.length >= field.schema.maxItems) return;
    items.push(createDefaultValue(field.item?.schema ?? field.schema.items));
    this.commitPath(field.path, items);
  }

  private removeArrayItem(path: readonly string[], index: number): void {
    if (this.disabled || this.disabledByForm || this.readOnly) return;
    const current = getJsonPath(this.currentData, path);
    if (!Array.isArray(current)) return;
    if (current.length <= 0) return;
    this.commitPath(path, current.filter((_, itemIndex) => itemIndex !== index));
  }

  private restoreData(data: JsonObject): void {
    this.currentData = cloneJson(data);
    this.data = this.currentData;
    this.observedData = this.currentData;
    if (this.refreshValidation()) this.emitValidationChange();
  }

  private refreshValidation(): boolean {
    this.validationErrors = validateJsonFormData(this.schema, this.currentData, this.uischema).errors;
    const nextSignature = JSON.stringify(this.validationErrors);
    const changed = nextSignature !== this.validationSignature;
    this.validationSignature = nextSignature;
    return changed;
  }

  private synchronizeFormState(): void {
    if (!this.internals) return;
    const serialized = JSON.stringify(this.currentData);
    this.internals.setFormValue(serialized, serialized);
    const firstError = this.validationErrors[0];
    if (firstError) {
      const field = this.shadowRoot?.querySelector<HTMLElement>('[aria-invalid="true"]');
      this.internals.setValidity({ customError: true }, firstError.message, field ?? undefined);
    } else {
      this.internals.setValidity({});
    }
  }

  private errorsForPath(path: readonly string[], descendants: boolean): readonly JsonFormValidationError[] {
    const instancePath = jsonInstancePath(path);
    const parentPath = jsonInstancePath(path.slice(0, -1));
    const name = path.at(-1);
    return this.validationErrors.filter((error) => (
      error.instancePath === instancePath
      || (descendants && error.instancePath.startsWith(`${instancePath}/`))
      || (name !== undefined && error.instancePath === parentPath && error.property === name)
    ));
  }

  private changeDetail(): JsonFormChangeDetail {
    return Object.freeze({
      data: freezeJson(cloneJson(this.currentData)),
      errors: Object.freeze(this.validationErrors.map((error) => Object.freeze({ ...error }))),
    });
  }

  private emitValidationChange(): void {
    this.emit('validation-change', Object.freeze({
      valid: this.validationErrors.length === 0,
      errors: Object.freeze(this.validationErrors.map((error) => Object.freeze({ ...error }))),
    }));
  }
}

/** Registers the component in the supplied Custom Element registry. */
export function registerJsonForms(): typeof JsonFormsElement {
  return defineElement(jsonFormsTag, JsonFormsElement);
}

/** Renders the registered element from a Gluon application template. */
export function JsonForm(options: JsonFormOptions): TemplateValue {
  registerJsonForms();
  return html`
    <gluon-json-form
      name=${options.name ?? undefined}
      .schema=${options.schema as unknown as Record<string, unknown>}
      .uischema=${options.uischema as unknown as Record<string, unknown> | undefined}
      .data=${options.data as unknown as Record<string, unknown> | undefined}
      ?disabled=${options.disabled ?? false}
      ?readonly=${options.readOnly ?? false}
      @change=${options.onChange as EventListener | undefined}
      @validation-change=${options.onValidationChange as EventListener | undefined}
    ></gluon-json-form>
  `;
}

function parseJsonObject(value: string): JsonObject | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return isJsonObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function rebaseField(field: JsonFormField, path: readonly string[], label = field.label): JsonFormField {
  const children = field.children?.map((child) => rebaseField(child, [...path, child.name]));
  return Object.freeze({
    ...field,
    name: path.at(-1) ?? field.name,
    path: Object.freeze([...path]),
    label,
    ...(children ? { children: Object.freeze(children) } : {}),
  });
}

function createDefaultValue(schema: JsonSchema | undefined): JsonValue {
  if (!schema) return Object.freeze({});
  if (schema.default !== undefined) return cloneJson(schema.default);
  if (schema.enum?.[0] !== undefined) return cloneJson(schema.enum[0]);
  if (schema.type === 'object') return applySchemaDefaults(schema, Object.freeze({}));
  if (schema.type === 'array') return Object.freeze([]);
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number' || schema.type === 'integer') return 0;
  return '';
}

function getJsonPath(root: JsonObject, path: readonly string[]): JsonValue | undefined {
  let current: unknown = root;
  for (const segment of path) {
    if (Array.isArray(current)) current = current[Number(segment)];
    else if (current !== null && typeof current === 'object') current = (current as Record<string, unknown>)[segment];
    else return undefined;
  }
  return current as JsonValue | undefined;
}

function updateJsonPath(root: JsonObject, path: readonly string[], value: JsonValue | undefined): JsonObject {
  const next = cloneJson(root) as JsonObject;
  if (path.length === 0) return next;
  let current: unknown = next;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    const nextSegment = path[index + 1]!;
    if (Array.isArray(current)) {
      const itemIndex = Number(segment);
      if (current[itemIndex] === undefined) current[itemIndex] = /^\d+$/.test(nextSegment) ? [] : {} as never;
      current = current[itemIndex];
    } else {
      const record = current as Record<string, unknown>;
      if (record[segment] === undefined || record[segment] === null) record[segment] = /^\d+$/.test(nextSegment) ? [] : {};
      current = record[segment];
    }
  }
  const leaf = path.at(-1)!;
  if (Array.isArray(current)) {
    const itemIndex = Number(leaf);
    if (value === undefined) current.splice(itemIndex, 1);
    else current[itemIndex] = value;
  } else {
    const record = current as Record<string, JsonValue | undefined>;
    if (value === undefined) delete record[leaf];
    else record[leaf] = value;
  }
  return Object.freeze(next);
}

function jsonInstancePath(path: readonly string[]): string {
  return path.length === 0 ? '' : `/${path.map((segment) => segment.replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
}

function fieldId(path: readonly string[]): string {
  return `field-${path.map((segment) => segment.replaceAll(/[^A-Za-z0-9_-]/g, '-')).join('-')}`;
}
