export interface ProductConfiguration {
  finish: 'Graphite' | 'Cobalt' | 'Bone';
  temperature: 'Warm 2700K' | 'Clear 3200K';
  cable: '1.5 m' | '2.5 m';
}

export const productConfigurationChoices = Object.freeze({
  finish: ['Graphite', 'Cobalt', 'Bone'] as const,
  temperature: ['Warm 2700K', 'Clear 3200K'] as const,
  cable: ['1.5 m', '2.5 m'] as const,
}) satisfies Readonly<{
  [Key in keyof ProductConfiguration]: readonly ProductConfiguration[Key][];
}>;

export function createDefaultProductConfiguration(): ProductConfiguration {
  return {
    finish: 'Cobalt',
    temperature: 'Warm 2700K',
    cable: '1.5 m',
  };
}

export function cloneProductConfiguration(
  configuration: ProductConfiguration,
): ProductConfiguration {
  return { ...configuration };
}

export function isProductConfiguration(value: unknown): value is ProductConfiguration {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProductConfiguration>;
  return productConfigurationChoices.finish.includes(candidate.finish as ProductConfiguration['finish'])
    && productConfigurationChoices.temperature.includes(candidate.temperature as ProductConfiguration['temperature'])
    && productConfigurationChoices.cable.includes(candidate.cable as ProductConfiguration['cable']);
}

export function serializeProductConfiguration(configuration: ProductConfiguration): string {
  return JSON.stringify(configuration);
}

export function parseProductConfiguration(value: string): ProductConfiguration | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return isProductConfiguration(parsed) ? cloneProductConfiguration(parsed) : undefined;
  } catch {
    return undefined;
  }
}
