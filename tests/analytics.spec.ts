import { describe, expect, it, vi } from 'vitest';
import {
  createAnalytics,
  createGa4Adapter,
  createServerAnalytics,
  trackEvent,
  trackImpression,
} from '@gluonjs/core/analytics';
import { html, render } from '@gluonjs/core';

describe('@gluonjs/core/analytics', () => {
  it('inherits context, enriches events, and deduplicates impressions', () => {
    const sent: Readonly<Record<string, unknown>>[] = [];
    const analytics = createAnalytics({
      now: () => 42,
      enrich: () => ({ locale: 'de-DE' }),
      adapters: [createGa4Adapter((event) => { sent.push(event); })],
    });
    const listing = analytics.scope({ item_list_id: 'featured' });

    listing.impression('product:lamp', 'view_item', { item_id: 'lamp' });
    listing.impression('product:lamp', 'view_item', { item_id: 'lamp' });
    listing.child({ campaign: 'summer' }).track('select_item', { item_id: 'lamp' });

    expect(sent).toEqual([
      { event: 'view_item', item_id: 'lamp', item_list_id: 'featured', locale: 'de-DE' },
      { event: 'select_item', item_id: 'lamp', item_list_id: 'featured', campaign: 'summer', locale: 'de-DE' },
    ]);
  });

  it('does not deliver server events and respects consent', () => {
    const send = vi.fn();
    createServerAnalytics({ adapters: [{ id: 'test', send }] }).scope().track('purchase', { value: 1 });
    const denied = createAnalytics({ consent: () => 'denied', adapters: [{ id: 'test', send }] });
    denied.scope().track('purchase', { value: 1 });
    expect(send).not.toHaveBeenCalled();
  });

  it('supports lifecycle directives, explicit context, recovery, and primitive GA4 payloads', async () => {
    const root = document.createElement('div');
    const sent: Readonly<Record<string, unknown>>[] = [];
    const debug: string[] = [];
    const analytics = createAnalytics({
      now: () => 7,
      enrich: () => ({}),
      debug: (event) => { debug.push(event.name); },
      adapters: [
        createGa4Adapter((event) => { sent.push(event); }),
        { id: 'throwing', send: () => { throw new Error('sync failure'); } },
        { id: 'async', send: () => Promise.reject(new Error('async failure')) },
      ],
    });
    const scope = analytics.scope({ page: 'catalog' });

    render(html`<div>${trackEvent(scope, 'select_item', { item_id: 'lamp' })}</div>`, root);
    render(html`<div>${trackEvent(scope, 'select_item', { item_id: 'lamp' })}</div>`, root);
    render(html`<div>${trackEvent(scope, 'select_item', { item_id: 'lamp' }, undefined, { emitOnUpdate: true })}</div>`, root);
    render(html`<div>${trackEvent(scope.child({ section: 'featured' }), 'select_item', { item_id: 'lamp' })}</div>`, root);
    const initialDirective = trackEvent(scope, 'select_item', { item_id: 'lamp' });
    const changedDirective = trackEvent(scope.child({ section: 'featured' }), 'select_item', { item_id: 'lamp' });
    const directiveDefinition = Reflect.get(initialDirective, Object.getOwnPropertySymbols(initialDirective)[0]!) as {
      update(part: unknown, args: readonly unknown[], previousArgs: readonly unknown[]): void;
    };
    directiveDefinition.update({}, initialDirective.args, initialDirective.args);
    directiveDefinition.update({}, changedDirective.args, initialDirective.args);
    render(html`<div>${trackImpression(scope, 'lamp', 'view_item', 3)}</div>`, root);
    render(html`<div>${trackImpression(scope, 'lamp', 'view_item', 3)}</div>`, root);

    analytics.withContext({ route: '/catalog' }, (nested) => {
      nested.track('custom', 3, { context: { source: 'test' }, dedupeKey: 'custom-once' });
      nested.track('custom', 3, { dedupeKey: 'custom-once' });
    });
    analytics.scope().track('value', 5);
    analytics.clearImpressions();
    scope.impression('lamp', 'view_item', 3);

    await Promise.resolve();
    expect(sent).toEqual([
      { event: 'select_item', item_id: 'lamp', page: 'catalog' },
      { event: 'select_item', item_id: 'lamp', page: 'catalog' },
      { event: 'select_item', item_id: 'lamp', page: 'catalog' },
      { event: 'select_item', item_id: 'lamp', page: 'catalog', section: 'featured' },
      { event: 'select_item', item_id: 'lamp', page: 'catalog', section: 'featured' },
      { event: 'view_item', value: 3, page: 'catalog' },
      { event: 'custom', value: 3, route: '/catalog', source: 'test' },
      { event: 'value', value: 5 },
      { event: 'view_item', value: 3, page: 'catalog' },
    ]);
    expect(debug).toContain('analytics_adapter_error');
  });
});
