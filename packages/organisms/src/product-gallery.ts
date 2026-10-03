import { defineOrganism, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { productGalleryStyleDependency } from './product-gallery-styles.js';

export type ProductGalleryAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']>;
};

export type ProductGalleryImageAttributes = Omit<QuarkProps<HTMLImageElement>, 'children' | 'src' | 'alt'>;

export interface ProductGalleryImage {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
  readonly primary?: boolean;
  readonly attributes?: ProductGalleryImageAttributes;
}

export interface ProductGalleryProps {
  readonly id: string;
  readonly images: readonly [ProductGalleryImage, ...ProductGalleryImage[]];
  readonly label: string;
  readonly attributes?: ProductGalleryAttributes;
}

function renderProductGallery({ id, images, label, attributes = {} }: ProductGalleryProps): TemplateResult {
  assertDomId('ProductGallery.id', id);
  assertNonEmpty('ProductGallery.label', label);
  if (!images.length) throw new TypeError('ProductGallery.images must contain at least one image.');

  const imageIds = new Set<string>();
  for (const image of images) {
    assertDomId('ProductGalleryImage.id', image.id);
    assertNonEmpty('ProductGalleryImage.src', image.src);
    if (imageIds.has(image.id)) throw new TypeError(`ProductGallery.images contains duplicate id "${image.id}".`);
    imageIds.add(image.id);
  }

  const primaryIndex = Math.max(0, images.findIndex((image) => image.primary));
  const { aria, ...nativeAttributes } = attributes;

  return q.section({
    ...nativeAttributes,
    id,
    data: { ...attributes.data, productGalleryRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-product-gallery': true }, attributes.class],
    aria: { ...aria, label: aria?.label ?? label },
    children: images.map((image, index) => q.figure({
      data: { productGalleryImage: image.id },
      class: [{ 'gluon-product-gallery-item': true, 'gluon-product-gallery-primary': index === primaryIndex }, image.attributes?.class],
      children: q.img({ ...image.attributes, src: image.src, alt: image.alt }),
    })),
  });
}

export const ProductGallery = defineOrganism(renderProductGallery, 'ProductGallery', [productGalleryStyleDependency]);

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}
