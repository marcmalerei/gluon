export interface WritableModel<Value> {
  value: Value;
}

export interface ModelModifiers {
  readonly trim?: boolean;
  readonly number?: boolean;
  readonly lazy?: boolean;
}

interface BaseModelOptions<Value> {
  readonly modifiers?: ModelModifiers;
  readonly transform?: (value: unknown, event: Event) => Value;
}

export interface TextModelOptions<Value> extends BaseModelOptions<Value> {
  readonly kind?: 'text';
}

export type CheckboxModelOptions<Value> = BaseModelOptions<Value> & {
  readonly kind: 'checkbox';
} & (Value extends readonly (infer Item)[]
  ? { readonly value: Item }
  : Value extends boolean
    ? { readonly value?: never }
    : { readonly value?: unknown });

export interface RadioModelOptions<Value> extends BaseModelOptions<Value> {
  readonly kind: 'radio';
  readonly value: Value;
}

export interface SelectModelOptions<Value> extends BaseModelOptions<Value> {
  readonly kind: 'select';
}

export interface CustomModelOptions<Value> extends BaseModelOptions<Value> {
  readonly kind: 'custom';
  readonly property?: string;
  readonly event?: string;
  readonly modifiersProperty?: string;
}

export type ModelOptions<Value> =
  | TextModelOptions<Value>
  | CheckboxModelOptions<Value>
  | RadioModelOptions<Value>
  | SelectModelOptions<Value>
  | CustomModelOptions<Value>;

export type ModelBinding = Readonly<Record<string, unknown>>;

export function model<Value>(
  source: WritableModel<Value>,
  options: ModelOptions<Value> = {},
): ModelBinding {
  switch (options.kind) {
    case 'checkbox':
      return checkboxBinding(source, options);
    case 'radio':
      return radioBinding(source, options);
    case 'select':
      return selectBinding(source, options);
    case 'custom':
      return customBinding(source, options);
    case 'text':
    case undefined:
      return textBinding(source, options);
  }
}

function textBinding<Value>(
  source: WritableModel<Value>,
  options: TextModelOptions<Value>,
): ModelBinding {
  const eventName = options.modifiers?.lazy ? 'onChange' : 'onInput';
  return Object.freeze({
    '.value': source.value,
    [eventName]: (event: Event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        throw new TypeError('A text model requires an input or textarea event target.');
      }
      source.value = resolveValue(target.value, event, options);
    },
  });
}

function checkboxBinding<Value>(
  source: WritableModel<Value>,
  options: CheckboxModelOptions<Value>,
): ModelBinding {
  const item = (options as BaseModelOptions<Value> & { readonly value?: unknown }).value;
  const current = source.value;
  const checked = Array.isArray(current)
    ? current.some((value) => Object.is(value, item))
    : Boolean(current);
  return Object.freeze({
    '.checked': checked,
    ...(item === undefined ? {} : { '.value': item }),
    onChange: (event: Event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
        throw new TypeError('A checkbox model requires a checkbox input event target.');
      }
      if (Array.isArray(source.value)) {
        const values = [...source.value] as unknown[];
        const index = values.findIndex((value) => Object.is(value, item));
        if (target.checked && index < 0) values.push(item);
        if (!target.checked && index >= 0) values.splice(index, 1);
        source.value = resolveValue(values, event, options);
      } else {
        source.value = resolveValue(target.checked, event, options);
      }
    },
  });
}

function radioBinding<Value>(
  source: WritableModel<Value>,
  options: RadioModelOptions<Value>,
): ModelBinding {
  return Object.freeze({
    '.checked': Object.is(source.value, options.value),
    '.value': options.value,
    onChange: (event: Event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement) || target.type !== 'radio') {
        throw new TypeError('A radio model requires a radio input event target.');
      }
      if (target.checked) source.value = resolveValue(options.value, event, options);
    },
  });
}

function selectBinding<Value>(
  source: WritableModel<Value>,
  options: SelectModelOptions<Value>,
): ModelBinding {
  return Object.freeze({
    '.value': source.value,
    onChange: (event: Event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLSelectElement)) {
        throw new TypeError('A select model requires a select event target.');
      }
      const value = target.multiple
        ? [...target.selectedOptions].map((option) => option.value)
        : target.value;
      source.value = resolveValue(value, event, options);
    },
  });
}

function customBinding<Value>(
  source: WritableModel<Value>,
  options: CustomModelOptions<Value>,
): ModelBinding {
  const property = options.property ?? 'modelValue';
  const eventName = options.event ?? `update:${property}`;
  const modifiersProperty = options.modifiersProperty ?? `${property}Modifiers`;
  return Object.freeze({
    [`.${property}`]: source.value,
    [`.${modifiersProperty}`]: Object.freeze({ ...(options.modifiers ?? {}) }),
    [`@${eventName}`]: (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        throw new TypeError('A custom model update must use a CustomEvent.');
      }
      source.value = resolveValue(event.detail, event, options);
    },
  });
}

function resolveValue<Value>(
  value: unknown,
  event: Event,
  options: BaseModelOptions<Value>,
): Value {
  let nextValue = value;
  if (options.modifiers?.trim && typeof nextValue === 'string') {
    nextValue = nextValue.trim();
  }
  if (options.modifiers?.number && typeof nextValue === 'string' && nextValue.length > 0) {
    const numeric = Number.parseFloat(nextValue);
    if (!Number.isNaN(numeric)) nextValue = numeric;
  }
  return options.transform
    ? options.transform(nextValue, event)
    : nextValue as Value;
}
