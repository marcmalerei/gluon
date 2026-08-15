import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { avatarStyleDependency } from './avatar-styles.js';

/** Caller-owned image lifecycle presented by {@link Avatar}. */
export type AvatarStatus = 'loading' | 'loaded' | 'error';

/** Native image attributes forwarded only when Avatar renders its image. */
export type AvatarAttributes = Omit<
  QuarkProps<HTMLImageElement>,
  | 'children'
  | 'src'
  | '.src'
  | 'alt'
  | '.alt'
  | 'role'
  | 'aria'
  | 'aria-label'
  | 'aria-hidden'
>;

export interface AvatarProps {
  /** Caller-owned image URL. Avatar never fetches account or profile data. */
  readonly src?: string;
  /** Required meaningful alternative text for both image and fallback states. */
  readonly alt: string;
  /** Visible fallback text, usually initials. Defaults to the first alt character. */
  readonly fallback?: string;
  /** Caller-owned lifecycle state. Missing `src` always resolves to `error`. */
  readonly status?: AvatarStatus;
  /** Typed native image attributes used only in the loaded state. */
  readonly attributes?: AvatarAttributes;
}

function renderAvatar({
  src,
  alt,
  fallback,
  status = src ? 'loaded' : 'error',
  attributes = {},
}: AvatarProps): TemplateResult {
  if (!alt.trim()) {
    throw new TypeError('Avatar alt must be a non-empty meaningful description.');
  }

  const effectiveStatus: AvatarStatus = src ? status : 'error';
  const content = effectiveStatus === 'loaded'
    ? q.img(mergeProps({
        class: 'gluon-avatar__image',
        src,
        alt,
      }, attributes) as QuarkProps<HTMLImageElement>)
    : q.span({
        class: 'gluon-avatar__fallback',
        role: 'img',
        aria: {
          label: alt,
          busy: effectiveStatus === 'loading' || undefined,
        },
        children: q.span({
          aria: { hidden: true },
          children: fallback ?? alt.trim().slice(0, 1).toUpperCase(),
        }),
      });

  return q.span({
    class: {
      gluon: true,
      atom: true,
      'gluon-avatar': true,
      [`is-${effectiveStatus}`]: true,
    },
    children: content,
  });
}

export const Avatar = defineAtom(
  renderAvatar,
  'Avatar',
  [avatarStyleDependency],
);
