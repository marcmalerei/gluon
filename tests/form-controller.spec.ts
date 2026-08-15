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
