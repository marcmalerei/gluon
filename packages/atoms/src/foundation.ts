import {
  defineAtom,
  mergeProps,
  type TemplateResult,
  type TemplateValue,
} from '@gluonjs/core';
import { quark, q, type QuarkProps } from '@gluonjs/quarks';
import { inputStyleDependency } from './input-styles.js';
import { foundationStyleDependency } from './foundation-styles.js';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type TextTone = 'default' | 'muted' | 'danger';
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type HeadingAttributes = QuarkProps<HTMLHeadingElement>;
export interface HeadingProps {
  readonly level?: HeadingLevel;
  readonly children?: TemplateValue;
  readonly attributes?: HeadingAttributes;
}

function renderHeading({ level = 2, children, attributes = {} }: HeadingProps): TemplateResult {
  const tag = `h${level}` as keyof HTMLElementTagNameMap;
  return quark(tag)({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-heading': true }, attributes.class],
    data: { ...attributes.data, gluonLevel: String(level) },
    children,
  } as never);
}

export const Heading = defineAtom(renderHeading, 'Heading', [foundationStyleDependency]);

export interface TextProps {
  readonly as?: 'p' | 'span' | 'div';
  readonly tone?: TextTone;
  readonly children?: TemplateValue;
  readonly attributes?: QuarkProps<HTMLElement>;
}

function renderText({ as = 'p', tone = 'default', children, attributes = {} }: TextProps): TemplateResult {
  return quark(as)({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-text': true, [`is-${tone}`]: tone !== 'default' }, attributes.class],
    children,
  } as never);
}

export const Text = defineAtom(renderText, 'Text', [foundationStyleDependency]);

export interface LinkProps {
  readonly href?: string;
  readonly children?: TemplateValue;
  readonly attributes?: Omit<QuarkProps<HTMLAnchorElement>, 'children' | 'href'>;
}

function renderLink({ href, children, attributes = {} }: LinkProps): TemplateResult {
  return q.a({
    ...attributes,
    ...(href === undefined ? {} : { href }),
    class: [{ gluon: true, atom: true, 'gluon-link': true }, attributes.class],
    children,
  });
}

export const Link = defineAtom(renderLink, 'Link', [foundationStyleDependency]);

export interface ImageProps {
  readonly src: string;
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
  readonly loading?: 'eager' | 'lazy';
  readonly decoding?: 'async' | 'auto' | 'sync';
  readonly attributes?: Omit<QuarkProps<HTMLImageElement>, 'children' | 'src' | 'alt'>;
}

function renderImage({ src, alt, width, height, loading = 'lazy', decoding = 'async', attributes = {} }: ImageProps): TemplateResult {
  return q.img({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-image': true }, attributes.class],
    src,
    alt,
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    loading,
    decoding,
  });
}

export const Image = defineAtom(renderImage, 'Image', [foundationStyleDependency]);

export interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly children?: TemplateValue;
  readonly attributes?: QuarkProps<HTMLSpanElement>;
}

function renderBadge({ tone = 'neutral', children, attributes = {} }: BadgeProps): TemplateResult {
  return q.span({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-badge': true, [`is-${tone}`]: tone !== 'neutral' }, attributes.class],
    children,
  });
}

export const Badge = defineAtom(renderBadge, 'Badge', [foundationStyleDependency]);

export interface SpinnerProps {
  readonly label?: string;
  readonly attributes?: QuarkProps<HTMLSpanElement>;
}

function renderSpinner({ label = 'Loading', attributes = {} }: SpinnerProps = {}): TemplateResult {
  return q.span({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-spinner': true }, attributes.class],
    role: 'status',
    aria: { ...attributes.aria, label },
  });
}

export const Spinner = defineAtom(renderSpinner, 'Spinner', [foundationStyleDependency]);

export interface SkeletonProps {
  readonly width?: string;
  readonly height?: string;
  readonly attributes?: QuarkProps<HTMLDivElement>;
}

function renderSkeleton({ width, height, attributes = {} }: SkeletonProps): TemplateResult {
  const defaultStyle = {
    ...(width === undefined ? {} : { '--gluon-skeleton-width': width }),
    ...(height === undefined ? {} : { '--gluon-skeleton-height': height }),
  };
  const style = typeof attributes.style === 'string'
    ? `${Object.entries(defaultStyle).map(([name, value]) => `${name}: ${value};`).join('')}${attributes.style}`
    : mergeProps(defaultStyle, attributes.style ?? {});
  return q.div({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-skeleton': true }, attributes.class],
    style,
    aria: { ...attributes.aria, hidden: 'true' },
  });
}

export const Skeleton = defineAtom(renderSkeleton, 'Skeleton', [foundationStyleDependency]);

export interface MeterProps {
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly children?: TemplateValue;
  readonly attributes?: Omit<QuarkProps<HTMLMeterElement>, 'children' | 'value' | 'min' | 'max'>;
}

function renderMeter({ value, min = 0, max = 100, children, attributes = {} }: MeterProps): TemplateResult {
  return q.meter({
    ...attributes,
    class: [{ gluon: true, atom: true, 'gluon-meter': true }, attributes.class],
    value,
    min,
    max,
    children,
  });
}

export const Meter = defineAtom(renderMeter, 'Meter', [foundationStyleDependency]);

export type NumberInputProps = Omit<import('./input.js').InputProps, 'type'>;
export type DateInputProps = NumberInputProps;
export type TimeInputProps = NumberInputProps;

function renderSpecializedInput(type: 'number' | 'date' | 'time', props: NumberInputProps): TemplateResult {
  const { attributes = {}, ...rest } = props;
  return q.input({
    ...attributes,
    ...rest,
    class: [{ gluon: true, atom: true, 'gluon-input': true }, attributes.class],
    type,
  } as QuarkProps<HTMLInputElement>);
}

export const NumberInput = defineAtom((props: NumberInputProps) => renderSpecializedInput('number', props), 'NumberInput', [inputStyleDependency]);
export const DateInput = defineAtom((props: DateInputProps) => renderSpecializedInput('date', props), 'DateInput', [inputStyleDependency]);
export const TimeInput = defineAtom((props: TimeInputProps) => renderSpecializedInput('time', props), 'TimeInput', [inputStyleDependency]);
