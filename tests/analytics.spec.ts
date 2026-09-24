import { describe, expect, it, vi } from 'vitest';
import {
  createAnalytics,
  createGa4Adapter,
  createServerAnalytics,
} from '@gluonjs/core/analytics';

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
});
