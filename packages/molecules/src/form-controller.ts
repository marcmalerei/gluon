export type FormFieldName<Values extends Record<string, unknown>> = Extract<keyof Values, string>;
export type FormErrors<Values extends Record<string, unknown>> = Partial<Record<FormFieldName<Values>, string>>;
export type FormTouched<Values extends Record<string, unknown>> = Partial<Record<FormFieldName<Values>, boolean>>;

export interface FormValidationContext<Values extends Record<string, unknown>> {
  readonly values: Readonly<Values>;
  readonly touched: Readonly<FormTouched<Values>>;
  readonly signal: AbortSignal;
}

export type FormValidator<Values extends Record<string, unknown>> = (
  values: Readonly<Values>,
  context: FormValidationContext<Values>,
) => FormErrors<Values> | void | Promise<FormErrors<Values> | void>;

export type FormSubmitHandler<Values extends Record<string, unknown>, Result> = (
  values: Readonly<Values>,
  context: FormValidationContext<Values>,
) => Result | Promise<Result>;

export interface FormControllerOptions<Values extends Record<string, unknown>, Result = void> {
  readonly initialValues: Values;
  readonly validate?: FormValidator<Values>;
  readonly onSubmit?: FormSubmitHandler<Values, Result>;
}

export interface FormState<Values extends Record<string, unknown>> {
  readonly values: Readonly<Values>;
  readonly errors: Readonly<FormErrors<Values>>;
  readonly touched: Readonly<FormTouched<Values>>;
  readonly registered: readonly FormFieldName<Values>[];
  readonly dirty: boolean;
  readonly validating: boolean;
  readonly submitting: boolean;
  readonly submitted: boolean;
  readonly submitError?: string;
}

export interface FormSnapshot<Values extends Record<string, unknown>> {
  readonly version: 1;
  readonly initialValues: Readonly<Values>;
  readonly values: Readonly<Values>;
  readonly errors: Readonly<FormErrors<Values>>;
  readonly touched: Readonly<FormTouched<Values>>;
}

export interface FormFieldBinding<Values extends Record<string, unknown>, Name extends FormFieldName<Values>> {
  readonly name: Name;
  readonly value: Values[Name];
  readonly error: string | undefined;
  readonly touched: boolean;
  setValue(value: Values[Name]): void;
  setTouched(touched?: boolean): void;
  unregister(): void;
}

export type FormListener<Values extends Record<string, unknown>> = (state: FormState<Values>) => void;
export type FormSubmitResult<Result> =
  | { readonly ok: true; readonly value: Result | undefined }
  | { readonly ok: false; readonly reason: 'validation' };
export interface FormOperationOptions { readonly signal?: AbortSignal }

export interface FormController<Values extends Record<string, unknown>, Result = void> {
  readonly state: FormState<Values>;
  register<Name extends FormFieldName<Values>>(name: Name): FormFieldBinding<Values, Name>;
  setValue<Name extends FormFieldName<Values>>(name: Name, value: Values[Name]): void;
  setTouched<Name extends FormFieldName<Values>>(name: Name, touched?: boolean): void;
  setError<Name extends FormFieldName<Values>>(name: Name, error?: string): void;
  clearErrors(): void;
  validate(options?: FormOperationOptions): Promise<boolean>;
  submit(options?: FormOperationOptions): Promise<FormSubmitResult<Result>>;
  reset(values?: Values): void;
  snapshot(): FormSnapshot<Values>;
  hydrate(snapshot: FormSnapshot<Values>): void;
  subscribe(listener: FormListener<Values>): () => void;
  dispose(): void;
}

/**
 * Creates request-free form state and lifecycle orchestration. It renders no
 * controls, reads no FormData, sends no requests, and is safe to construct in
 * SSR; applications retain native labels, constraint validation, and transport.
 */
export function createFormController<Values extends Record<string, unknown>, Result = void>(
  options: FormControllerOptions<Values, Result>,
): FormController<Values, Result> {
  let initial = copy(options.initialValues);
  let values = copy(options.initialValues);
  let errors: FormErrors<Values> = {};
  let touched: FormTouched<Values> = {};
  let validating = false;
  let submitting = false;
  let submitted = false;
  let submitError: string | undefined;
  let disposed = false;
  let revision = 0;
  let operation: Operation | undefined;
  const fields = new Set<FormFieldName<Values>>();
  const listeners = new Set<FormListener<Values>>();

  const makeState = (): FormState<Values> => Object.freeze({
    values: frozen(values),
    errors: frozen(errors),
    touched: frozen(touched),
    registered: Object.freeze([...fields]),
    dirty: Object.keys({ ...initial, ...values }).some((key) => !Object.is(initial[key], values[key])),
    validating,
    submitting,
    submitted,
    ...(submitError === undefined ? {} : { submitError }),
  });
  let state = makeState();
  const emit = (): void => {
    state = makeState();
    for (const listener of [...listeners]) listener(state);
  };
  const active = (): void => {
    if (disposed) throw new Error('The Gluon form controller has been disposed.');
  };
  const cancel = (): void => {
    operation?.controller.abort();
    operation?.unlink();
    operation = undefined;
  };
  const begin = (external?: AbortSignal): Operation => {
    active();
    cancel();
    if (external?.aborted) throw abortError();
    const controller = new AbortController();
    const unlinkCaller = () => controller.abort();
    external?.addEventListener('abort', unlinkCaller, { once: true });
    const next: Operation = {
      id: ++revision,
      controller,
      unlink: () => external?.removeEventListener('abort', unlinkCaller),
    };
    operation = next;
    return next;
  };
  const isCurrent = (next: Operation): boolean => (
    operation?.id === next.id && !next.controller.signal.aborted && !disposed
  );
  const finish = (next: Operation): void => {
    next.unlink();
    if (operation?.id === next.id) operation = undefined;
  };
  const context = (next: Operation): FormValidationContext<Values> => ({
    values: frozen(values),
    touched: frozen(touched),
    signal: next.controller.signal,
  });
  const runValidation = async (next: Operation): Promise<boolean> => {
    if (options.validate === undefined) {
      errors = {};
      validating = false;
      if (isCurrent(next)) emit();
      return true;
    }
    validating = true;
    submitError = undefined;
    emit();
    const result = await options.validate(frozen(values), context(next));
    if (!isCurrent(next)) throw abortError();
    errors = normalizeErrors(result);
    validating = false;
    emit();
    return Object.keys(errors).length === 0;
  };

  const controller: FormController<Values, Result> = {
    get state() { return state; },
    register(name) {
      active();
      if (!fields.has(name)) {
        fields.add(name);
        emit();
      }
      return {
        name,
        get value() { return values[name]; },
        get error() { return errors[name]; },
        get touched() { return touched[name] ?? false; },
        setValue: (value) => controller.setValue(name, value),
        setTouched: (value = true) => controller.setTouched(name, value),
        unregister: () => { if (fields.delete(name)) emit(); },
      };
    },
    setValue(name, value) {
      active();
      if (Object.is(values[name], value)) return;
      values = copy({ ...values, [name]: value } as Values);
      if (errors[name] !== undefined) {
        const next = { ...errors };
        delete next[name];
        errors = next;
      }
      submitError = undefined;
      emit();
    },
    setTouched(name, value = true) {
      active();
      if ((touched[name] ?? false) === value) return;
      touched = { ...touched, [name]: value };
      emit();
    },
    setError(name, error) {
      active();
      const next = { ...errors };
      if (error === undefined) delete next[name];
      else next[name] = error;
      errors = next;
      emit();
    },
    clearErrors() {
      active();
      errors = {};
      submitError = undefined;
      emit();
    },
    async validate(operationOptions = {}) {
      const next = begin(operationOptions.signal);
      try {
        return await runValidation(next);
      } finally {
        if (isCurrent(next)) {
          validating = false;
          emit();
        }
        finish(next);
      }
    },
    async submit(operationOptions = {}) {
      const next = begin(operationOptions.signal);
      submitted = true;
      submitError = undefined;
      emit();
      try {
        if (!await runValidation(next)) return { ok: false, reason: 'validation' };
        if (options.onSubmit === undefined) return { ok: true, value: undefined };
        if (!isCurrent(next)) throw abortError();
        submitting = true;
        emit();
        const value = await options.onSubmit(frozen(values), context(next));
        if (!isCurrent(next)) throw abortError();
        return { ok: true, value };
      } catch (error) {
        if (isCurrent(next) && !isAbort(error)) {
          submitError = error instanceof Error ? error.message : String(error);
          emit();
        }
        throw error;
      } finally {
        if (isCurrent(next)) {
          validating = false;
          submitting = false;
          emit();
        }
        finish(next);
      }
    },
    reset(nextValues = initial) {
      active();
      cancel();
      initial = copy(nextValues);
      values = copy(nextValues);
      errors = {};
      touched = {};
      validating = false;
      submitting = false;
      submitted = false;
      submitError = undefined;
      emit();
    },
    snapshot() {
      return Object.freeze({ version: 1 as const, initialValues: frozen(initial), values: frozen(values), errors: frozen(errors), touched: frozen(touched) });
    },
    hydrate(snapshot) {
      active();
      if (!snapshot || snapshot.version !== 1 || !isRecord(snapshot.initialValues) || !isRecord(snapshot.values)) {
        throw new TypeError('Invalid Gluon form snapshot.');
      }
      cancel();
      initial = copy(snapshot.initialValues as Values);
      values = copy(snapshot.values as Values);
      errors = normalizeErrors(snapshot.errors);
      touched = normalizeTouched(snapshot.touched);
      validating = false;
      submitting = false;
      submitted = false;
      submitError = undefined;
      emit();
    },
    subscribe(listener) {
      active();
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      listeners.clear();
    },
  };
  return Object.freeze(controller);
}

interface Operation {
  readonly id: number;
  readonly controller: AbortController;
  unlink(): void;
}

function copy<Values extends Record<string, unknown>>(value: Values): Values { return { ...value }; }
function frozen<Values extends Record<string, unknown>>(value: Values): Readonly<Values> { return Object.freeze({ ...value }); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object'; }

function normalizeErrors<Values extends Record<string, unknown>>(value: FormErrors<Values> | void): FormErrors<Values> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new TypeError('Gluon form validation must return a field-error record.');
  const result: FormErrors<Values> = {};
  for (const [name, error] of Object.entries(value)) {
    if (error !== undefined && typeof error !== 'string') throw new TypeError(`Gluon form error for "${name}" must be a string.`);
    if (error) (result as Record<string, string>)[name] = error;
  }
  return result;
}

function normalizeTouched<Values extends Record<string, unknown>>(value: FormTouched<Values>): FormTouched<Values> {
  if (!isRecord(value)) throw new TypeError('Gluon form touched state must be a record.');
  const result: FormTouched<Values> = {};
  for (const [name, touched] of Object.entries(value)) {
    if (typeof touched !== 'boolean') throw new TypeError(`Gluon form touched state for "${name}" must be boolean.`);
    if (touched) (result as Record<string, boolean>)[name] = true;
  }
  return result;
}

function abortError(): Error {
  if (typeof DOMException !== 'undefined') return new DOMException('The Gluon form operation was aborted.', 'AbortError');
  const error = new Error('The Gluon form operation was aborted.');
  error.name = 'AbortError';
  return error;
}
function isAbort(error: unknown): boolean { return error instanceof Error && error.name === 'AbortError'; }
