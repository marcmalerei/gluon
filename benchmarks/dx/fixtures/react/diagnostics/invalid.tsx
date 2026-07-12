import { QuantityControl } from '../app/components';
const product = { sku: 'GL-107', name: 'Evidence Tote', unitPrice: 24 };
export const invalidProp = <QuantityControl product="wrong" onQuantityChange={() => true} />;
export const invalidEvent = <QuantityControl product={product} onQuantityChange={(value: string) => value.length > 0} />;
