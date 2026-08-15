import { defineAtom, html, mergeProps, type TemplateResult } from '@gluonjs/core';
import { avatarStyleDependency } from './avatar-styles.js';
import type { QuarkProps } from '@gluonjs/quarks';
export type AvatarStatus = 'loading' | 'loaded' | 'error';
export type AvatarAttributes = Omit<QuarkProps<HTMLImageElement>, 'src'|'alt'|'children'>;
export interface AvatarProps { readonly src?: string; readonly alt: string; readonly fallback?: string; readonly status?: AvatarStatus; readonly attributes?: AvatarAttributes; }
export function renderAvatar({ src, alt, fallback, status = src ? 'loaded' : 'error', attributes = {} }: AvatarProps): TemplateResult {
  const failed = status === 'error' || !src;
  return html`<span class=${['gluon', 'atom', 'gluon-avatar', `is-${status}`]} role="img" aria-label=${alt}>${src ? html`<img ...=${mergeProps(attributes, { src, alt, 'aria-hidden': failed ? 'true' : null })}>` : ''}${failed ? html`<span class="gluon-avatar__fallback" aria-hidden="true">${fallback ?? alt.slice(0, 1).toUpperCase()}</span>` : ''}${status === 'loading' ? html`<span class="gluon-avatar__loading" aria-hidden="true"></span>` : ''}</span>`;
}
export const Avatar = defineAtom(renderAvatar, 'Avatar', [avatarStyleDependency]);
