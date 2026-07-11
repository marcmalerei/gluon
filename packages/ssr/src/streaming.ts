import type { TemplateValue } from '@gluonjs/core';
import { renderToChunks } from './index.js';

/** Adapts the ordered SSR chunk iterator to a byte ReadableStream. */
export function renderToReadableStream(value: TemplateValue): ReadableStream<Uint8Array> {
  const iterator = renderToChunks(value)[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done) controller.close();
      else controller.enqueue(encoder.encode(next.value));
    },
    async cancel() {
      await iterator.return?.(undefined);
    },
  });
}

export { renderToChunks } from './index.js';
