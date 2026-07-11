import type { TemplateValue } from '@gluonjs/core';
import { renderProgressively, renderToChunks, type ProgressiveRenderOptions } from './index.js';

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

/** Encodes a progressive shell and inert boundary patch templates as a byte stream. */
export function renderProgressiveReadableStream(
  value: TemplateValue,
  options: ProgressiveRenderOptions = {},
): ReadableStream<Uint8Array> {
  const iterator = renderProgressively(value, options)[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done) {
        controller.close();
        return;
      }
      const chunk = next.value.kind === 'shell'
        ? next.value.html
        : `<template data-gluon-async-patch="${next.value.id}">${next.value.html}</template>`;
      controller.enqueue(encoder.encode(chunk));
    },
    async cancel(reason) {
      await iterator.throw?.(reason);
    },
  });
}

export { renderProgressively, renderToChunks } from './index.js';
export type { ProgressiveRenderChunk, ProgressiveRenderOptions } from './index.js';
