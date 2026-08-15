import type { TemplateValue, TrustedTypesConfig } from '@gluonjs/core';
import {
  renderProgressively,
  renderStyleCarriers,
  renderToChunks,
  type ProgressiveRenderChunk,
  type RenderSerializationOptions,
  type ProgressiveRenderOptions,
} from './index.js';

/** Adapts the ordered SSR chunk iterator to a byte ReadableStream. */
export function renderToReadableStream(
  value: TemplateValue,
  options: RenderSerializationOptions = {},
): ReadableStream<Uint8Array> {
  const iterator = renderToChunks(value, options)[Symbol.asyncIterator]();
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
      const styles = renderStyleCarriers(next.value.styles);
      const chunk = next.value.kind === 'shell'
        ? `${styles}${next.value.html}`
        : `${styles}<template data-gluon-async-patch="${next.value.id}">${next.value.html}</template>`;
      controller.enqueue(encoder.encode(chunk));
    },
    async cancel(reason) {
      await iterator.throw?.(reason);
    },
  });
}

export type ProgressiveBoundaryChunk = Extract<ProgressiveRenderChunk, { readonly kind: 'boundary' }>;

export interface ProgressivePatchApplicationOptions {
  /** Optional document or shadow root that receives newly discovered style carriers. */
  readonly styleRoot?: Document | ShadowRoot;
  /** Cancels the patch before any DOM or style mutation takes place. */
  readonly signal?: AbortSignal;
  /** Optional application-owned Trusted Types policy for HTML parsing sinks. */
  readonly trustedTypes?: TrustedTypesConfig;
}

export interface ProgressivePatchApplicationResult {
  readonly id: number;
  readonly insertedNodes: number;
  readonly installedStyleIds: readonly string[];
}

export type ProgressivePatchErrorCode =
  | 'GLUON_SSR_PROGRESSIVE_ABORTED'
  | 'GLUON_SSR_PROGRESSIVE_INVALID_PATCH'
  | 'GLUON_SSR_PROGRESSIVE_BOUNDARY'
  | 'GLUON_SSR_PROGRESSIVE_STYLE'
  | 'GLUON_SSR_TRUSTED_TYPES_POLICY_REQUIRED'
  | 'GLUON_SSR_TRUSTED_TYPES_POLICY_INCOMPATIBLE';

export class ProgressivePatchError extends Error {
  constructor(readonly code: ProgressivePatchErrorCode, message: string) {
    super(message);
    this.name = 'ProgressivePatchError';
  }
}

/** Applies one `<template data-gluon-async-patch="id">` from the readable stream. */
export function applyProgressivePatchTemplate(
  root: ParentNode,
  template: HTMLTemplateElement,
  options: ProgressivePatchApplicationOptions = {},
): ProgressivePatchApplicationResult {
  const rawId = template.getAttribute('data-gluon-async-patch');
  const id = rawId === null ? Number.NaN : Number(rawId);
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new ProgressivePatchError(
      'GLUON_SSR_PROGRESSIVE_INVALID_PATCH',
      'A streamed progressive patch template requires a non-negative integer data-gluon-async-patch id.',
    );
  }
  return applyProgressivePatch(root, {
    kind: 'boundary',
    id,
    html: template.innerHTML,
    styles: { version: 1, entries: [] },
  }, options);
}

/**
 * Applies one resolved progressive boundary to the shell emitted by
 * `renderProgressively`. The shell's async comment pair is replaced in place;
 * nested boundary markers in the patch remain available for later patches.
 */
export function applyProgressivePatch(
  root: ParentNode,
  patch: ProgressiveBoundaryChunk,
  options: ProgressivePatchApplicationOptions = {},
): ProgressivePatchApplicationResult {
  throwIfProgressiveAborted(options.signal);
  if (!Number.isSafeInteger(patch.id) || patch.id < 0) {
    throw new ProgressivePatchError(
      'GLUON_SSR_PROGRESSIVE_INVALID_PATCH',
      'A progressive SSR patch requires a non-negative integer id.',
    );
  }
  const range = findProgressiveBoundary(root, patch.id);
  const document = root.nodeType === 9 ? root as Document : root.ownerDocument;
  if (!document) {
    throw new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_BOUNDARY', 'A progressive SSR patch root must belong to a document.');
  }
  const template = document.createElement('template');
  try {
    template.innerHTML = toTrustedHTML(patch.html, options.trustedTypes);
  } catch (error) {
    if (error instanceof ProgressivePatchError) throw error;
    throw new ProgressivePatchError(
      options.trustedTypes
        ? 'GLUON_SSR_TRUSTED_TYPES_POLICY_INCOMPATIBLE'
        : 'GLUON_SSR_TRUSTED_TYPES_POLICY_REQUIRED',
      options.trustedTypes
        ? `Trusted Types policy "${options.trustedTypes.policyName}" was rejected while parsing a progressive SSR patch.`
        : 'Browser Trusted Types enforcement rejected a progressive SSR patch; pass an application-owned trustedTypes policy.',
    );
  }
  const fragment = template.content;
  const insertedNodes = fragment.childNodes.length;
  throwIfProgressiveAborted(options.signal);
  const installedStyleIds = options.styleRoot
    ? installProgressiveStyles(options.styleRoot, patch.styles)
    : [];
  throwIfProgressiveAborted(options.signal);
  const anchor = range.close.nextSibling;
  let current: ChildNode | null = range.open;
  while (current) {
    const sibling: ChildNode | null = current.nextSibling;
    current.parentNode?.removeChild(current);
    if (current === range.close) break;
    current = sibling;
  }
  range.parent.insertBefore(fragment, anchor);
  return Object.freeze({
    id: patch.id,
    insertedNodes,
    installedStyleIds: Object.freeze(installedStyleIds),
  });
}

function toTrustedHTML(
  markup: string,
  trustedTypes?: ProgressivePatchApplicationOptions['trustedTypes'],
): string {
  if (!trustedTypes) return markup;
  if (
    typeof trustedTypes.policyName !== 'string'
    || trustedTypes.policyName.length === 0
    || trustedTypes.policyName.length > 128
    || !/^[A-Za-z0-9#=_/@.%:-]+$/.test(trustedTypes.policyName)
    || !trustedTypes.policy
    || typeof trustedTypes.policy.createHTML !== 'function'
    || (typeof trustedTypes.policy.name === 'string' && trustedTypes.policy.name !== trustedTypes.policyName)
  ) {
    throw new ProgressivePatchError(
      'GLUON_SSR_TRUSTED_TYPES_POLICY_INCOMPATIBLE',
      'A progressive SSR patch requires matching policyName and policy.createHTML() values.',
    );
  }
  let result: unknown;
  try {
    result = trustedTypes.policy.createHTML(markup);
  } catch {
    throw new ProgressivePatchError(
      'GLUON_SSR_TRUSTED_TYPES_POLICY_INCOMPATIBLE',
      `Trusted Types policy "${trustedTypes.policyName}" threw while parsing a progressive SSR patch.`,
    );
  }
  const factory = (globalThis as typeof globalThis & {
    readonly trustedTypes?: { isHTML?(value: unknown): boolean };
  }).trustedTypes;
  const compatible = typeof factory?.isHTML === 'function'
    ? factory.isHTML(result)
    : typeof result === 'string';
  if (!compatible) {
    throw new ProgressivePatchError(
      'GLUON_SSR_TRUSTED_TYPES_POLICY_INCOMPATIBLE',
      `Trusted Types policy "${trustedTypes.policyName}" did not return TrustedHTML for a progressive SSR patch.`,
    );
  }
  return result as string;
}

interface ProgressiveBoundaryRange {
  readonly parent: Node;
  readonly open: Comment;
  readonly close: Comment;
}

function findProgressiveBoundary(root: ParentNode, id: number): ProgressiveBoundaryRange {
  const document = root.nodeType === 9 ? root as Document : root.ownerDocument;
  if (!document) {
    throw new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_BOUNDARY', 'A progressive SSR patch root must belong to a document.');
  }
  const walker = document.createTreeWalker(root, 128);
  let open: Comment | undefined;
  let close: Comment | undefined;
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === 8) {
      if ((node.nodeValue ?? '') === `gluon:async:${id}`) {
        if (open) throw new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_BOUNDARY', `Progressive SSR boundary ${id} has duplicate start markers.`);
        open = node as Comment;
      } else if ((node.nodeValue ?? '') === `gluon:/async:${id}`) {
        if (close) throw new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_BOUNDARY', `Progressive SSR boundary ${id} has duplicate end markers.`);
        close = node as Comment;
      }
    }
    node = walker.nextNode();
  }
  if (!open || !close || !open.parentNode || open.parentNode !== close.parentNode) {
    throw new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_BOUNDARY', `Progressive SSR boundary ${id} is missing or malformed.`);
  }
  return { parent: open.parentNode, open, close };
}

function installProgressiveStyles(root: Document | ShadowRoot, manifest: ProgressiveRenderChunk['styles']): string[] {
  const target = (root.nodeType === 9
    ? ((root as Document).head ?? (root as Document).documentElement)
    : root) as Element | ShadowRoot | null;
  const ownerDocument: Document | null = root.nodeType === 9 ? root as Document : root.ownerDocument;
  if (!target || !ownerDocument) {
    throw new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_STYLE', 'A progressive SSR style root must have a document target.');
  }
  const installed: string[] = [];
  const pending: HTMLStyleElement[] = [];
  for (const entry of manifest.entries) {
    const existing = target.querySelector(`style[data-gluon-style="${escapeCssSelector(entry.id)}"]`);
    if (existing) {
      if (existing.getAttribute('data-gluon-digest') !== entry.digest || existing.textContent !== entry.cssText) {
        throw new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_STYLE', `Progressive SSR style carrier ${entry.id} does not match its manifest.`);
      }
      continue;
    }
    const style = ownerDocument.createElement('style');
    style.dataset.gluonStyle = entry.id;
    style.dataset.gluonDigest = entry.digest;
    if (entry.scope !== undefined) style.dataset.gluonStyleScope = entry.scope;
    style.textContent = entry.cssText;
    pending.push(style);
    installed.push(entry.id);
  }
  for (const style of pending) target.append(style);
  return installed;
}

function escapeCssSelector(value: string): string {
  return value.replace(/([\\"'])/g, '\\$1');
}

function throwIfProgressiveAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  throw new ProgressivePatchError(
    'GLUON_SSR_PROGRESSIVE_ABORTED',
    signal.reason instanceof Error ? signal.reason.message : 'Progressive SSR patch application was aborted.',
  );
}

export { renderProgressively, renderToChunks } from './index.js';
export type {
  ProgressiveRenderChunk,
  ProgressiveRenderOptions,
  RenderSerializationOptions,
} from './index.js';
