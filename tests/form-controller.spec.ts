import { describe, expect, it, vi } from 'vitest';
import {
  createFormController,
  type FormValidationContext,
} from '@gluonjs/molecules';

interface ProfileValues extends Record<string, unknown> {
  email: string;
  name: string;
}

describe('request-free form controller', () => {
  it('tracks registered fields, touched state, dirty values, errors, and reset', () => {
    const listener = vi.fn();
    const form = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
    });
    const email = form.register('email');
    form.subscribe(listener);
    email.setValue('ada@example.com');
    email.setTouched();
    form.setError('email', 'Use a personal address.');

    expect(form.state.registered).toEqual(['email']);
    expect(form.state.values.email).toBe('ada@example.com');
    expect(form.state.touched.email).toBe(true);
    expect(form.state.errors.email).toBe('Use a personal address.');
    expect(form.state.dirty).toBe(true);
    expect(listener).toHaveBeenCalled();

    form.reset();
    expect(form.state.values).toEqual({ email: '', name: '' });
    expect(form.state.errors).toEqual({});
    expect(form.state.touched).toEqual({});
    expect(form.state.dirty).toBe(false);
    form.dispose();
  });

  it('runs async validation and aborts superseded work', async () => {
    let calls = 0;
    const form = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
      validate: async (values, context) => {
        calls += 1;
        await abortableDelay(context, values.email === 'first' ? 80 : 0);
        return values.email.includes('@') ? {} : { email: 'Enter a valid email.' };
      },
    });
    form.setValue('email', 'first');
    const first = form.validate();
    form.setValue('email', 'ada@example.com');
    const second = form.validate();

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await expect(second).resolves.toBe(true);
    expect(calls).toBe(2);
    expect(form.state.errors).toEqual({});
    form.dispose();
  });

  it('serializes SSR-safe state and exposes submission cancellation to the application', async () => {
    const submitted = vi.fn(async (values: Readonly<ProfileValues>, context: FormValidationContext<ProfileValues>) => {
      expect(context.signal.aborted).toBe(false);
      return values.email;
    });
    const server = createFormController<ProfileValues, string>({
      initialValues: { email: 'ada@example.com', name: 'Ada Lovelace' },
      validate: (values) => values.name ? {} : { name: 'Enter your name.' },
      onSubmit: submitted,
    });
    server.setTouched('email');
    const snapshot = JSON.parse(JSON.stringify(server.snapshot()));
    const browser = createFormController<ProfileValues, string>({
      initialValues: { email: '', name: '' },
      onSubmit: submitted,
    });
    browser.hydrate(snapshot);

    expect(browser.state.values).toEqual({ email: 'ada@example.com', name: 'Ada Lovelace' });
    expect(browser.state.touched.email).toBe(true);
    expect(await browser.submit()).toEqual({ ok: true, value: 'ada@example.com' });
    expect(submitted).toHaveBeenCalledOnce();
    expect(browser.state.submitted).toBe(true);
    server.dispose();
    browser.dispose();
  });

  it('keeps the public lifecycle request-free when optional hooks are absent', async () => {
    const listener = vi.fn();
    const form = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
    });
    const email = form.register('email');
    form.register('email');
    const unsubscribe = form.subscribe(listener);

    email.setValue('');
    email.setTouched(false);
    expect(await form.validate()).toBe(true);
    expect(await form.submit()).toEqual({ ok: true, value: undefined });

    form.setError('email', 'invalid');
    form.setError('email');
    form.setTouched('email', true);
    form.setTouched('email', true);
    form.clearErrors();
    expect(email.error).toBeUndefined();
    expect(email.touched).toBe(true);

    email.unregister();
    email.unregister();
    expect(form.state.registered).toEqual([]);
    unsubscribe();
    form.reset({ email: 'reset@example.com', name: 'Reset' });
    expect(form.state.values).toEqual({ email: 'reset@example.com', name: 'Reset' });

    form.dispose();
    form.dispose();
    expect(() => form.register('email')).toThrow('disposed');
    expect(() => form.setValue('email', 'again@example.com')).toThrow('disposed');
    expect(() => form.subscribe(vi.fn())).toThrow('disposed');
  });

  it('rejects malformed validation and hydration data', async () => {
    const invalidResult = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
      validate: () => null as never,
    });
    await expect(invalidResult.validate()).rejects.toThrow('field-error record');
    invalidResult.dispose();

    const invalidError = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
      validate: () => ({ email: 42 } as never),
    });
    await expect(invalidError.validate()).rejects.toThrow('must be a string');
    invalidError.dispose();

    const form = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
    });
    const snapshot = form.snapshot();
    form.hydrate({
      ...snapshot,
      errors: { email: '', name: 'required' },
      touched: { email: false, name: true },
    });
    expect(form.state.errors).toEqual({ name: 'required' });
    expect(form.state.touched).toEqual({ name: true });

    expect(() => form.hydrate(null as never)).toThrow('Invalid Gluon form snapshot');
    expect(() => form.hydrate({ ...snapshot, version: 2 } as never)).toThrow('Invalid Gluon form snapshot');
    expect(() => form.hydrate({ ...snapshot, initialValues: null } as never)).toThrow('Invalid Gluon form snapshot');
    expect(() => form.hydrate({ ...snapshot, values: null } as never)).toThrow('Invalid Gluon form snapshot');
    expect(() => form.hydrate({ ...snapshot, errors: null } as never)).toThrow('field-error record');
    expect(() => form.hydrate({ ...snapshot, touched: null } as never)).toThrow('touched state must be a record');
    expect(() => form.hydrate({ ...snapshot, touched: { email: 'yes' } } as never)).toThrow('must be boolean');
    form.dispose();
  });

  it('reports submit failures and respects external abort signals', async () => {
    const failing = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
      onSubmit: () => { throw new Error('transport failed'); },
    });
    await expect(failing.submit()).rejects.toThrow('transport failed');
    expect(failing.state.submitError).toBe('transport failed');
    failing.clearErrors();
    expect(failing.state.submitError).toBeUndefined();
    failing.dispose();

    const stringFailure = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
      onSubmit: () => { throw 'transport failed without Error'; },
    });
    await expect(stringFailure.submit()).rejects.toBe('transport failed without Error');
    expect(stringFailure.state.submitError).toBe('transport failed without Error');
    stringFailure.dispose();

    const abortedBeforeStart = new AbortController();
    abortedBeforeStart.abort();
    const form = createFormController<ProfileValues>({
      initialValues: { email: '', name: '' },
      onSubmit: (_, context) => abortableDelay(context, 80).then(() => 'done'),
    });
    await expect(form.validate({ signal: abortedBeforeStart.signal })).rejects.toMatchObject({ name: 'AbortError' });

    const abortController = new AbortController();
    const submission = form.submit({ signal: abortController.signal });
    abortController.abort();
    await expect(submission).rejects.toMatchObject({ name: 'AbortError' });
    expect(form.state.submitError).toBeUndefined();
    form.dispose();
  });
});

function abortableDelay(context: FormValidationContext<ProfileValues>, milliseconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    };
    if (context.signal.aborted) abort();
    else context.signal.addEventListener('abort', abort, { once: true });
  });
}
