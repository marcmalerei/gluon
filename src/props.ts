export type ClassValue =
  | string
  | readonly ClassValue[]
  | Readonly<Record<string, unknown>>
  | null
  | undefined
  | false;

export type StyleValue =
  | string
  | Readonly<Record<string, string | number | null | undefined | false>>;

export interface MergeableProps {
  class?: ClassValue;
  className?: ClassValue;
  style?: StyleValue;
  [key: string]: unknown;
}

/**
 * Merges component defaults with caller props without dropping baseline class
 * or object-style values. All other keys use last-writer-wins semantics.
 */
export function mergeProps<
  Defaults extends object,
  Overrides extends object,
>(
  defaults: Defaults,
  overrides: Overrides,
): Defaults & Overrides;
export function mergeProps<Defaults extends object>(
  defaults: Defaults,
): Defaults;
export function mergeProps(
  defaults: object,
  overrides: object = {},
): MergeableProps {
  const merged = { ...defaults, ...overrides } as MergeableProps;
  const defaultProps = defaults as MergeableProps;
  const overrideProps = overrides as MergeableProps;
  const defaultClass = defaultProps.class ?? defaultProps.className;
  const overrideClass = overrideProps.class ?? overrideProps.className;

  if (defaultClass || overrideClass) {
    merged.class = [defaultClass, overrideClass];
    delete merged.className;
  }

  const defaultStyle = defaultProps.style;
  const overrideStyle = overrideProps.style;
  if (isStyleRecord(defaultStyle) && isStyleRecord(overrideStyle)) {
    merged.style = { ...defaultStyle, ...overrideStyle };
  }

  return merged;
}

function isStyleRecord(value: StyleValue | undefined): value is Readonly<Record<string, string | number | null | undefined | false>> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
