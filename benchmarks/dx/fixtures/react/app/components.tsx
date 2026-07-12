import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

export type Product = { sku: string; name: string; unitPrice: number };

export const PrimitiveButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: "purchase" | "danger" }>(
  function PrimitiveButton({ variant, className = "", ...native }, ref) {
    return <button ref={ref} className={`button button--${variant} ${className}`} data-variant={variant} {...native} />;
  },
);

export function FieldComposition({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function CheckoutShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="shell"><h1 data-product-title>{title}</h1>{children}</main>;
}

export type QuantityControlHandle = { focus(): void };
export type QuantityControlProps = {
  product: Product;
  initialValue?: number;
  onQuantityChange(value: number): boolean | void;
};

export const QuantityControl = forwardRef<QuantityControlHandle, QuantityControlProps>(function QuantityControl(
  { product, initialValue = 1, onQuantityChange }, ref,
) {
  const [quantity, setQuantity] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const total = useMemo(() => quantity * product.unitPrice, [quantity, product.unitPrice]);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);
  useEffect(() => {
    const timer = window.setInterval(() => undefined, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => setQuantity(initialValue), [initialValue]);
  function update(value: number) {
    if (value < 1 || value > 9 || !Number.isInteger(value)) return;
    if (onQuantityChange(value) !== false) setQuantity(value);
  }
  return <FieldComposition label="Quantity">
    <input ref={inputRef} name="quantity" type="number" min={1} max={9} value={quantity}
      aria-describedby="quantity-total" onChange={(event) => update(event.currentTarget.valueAsNumber)} />
    <output id="quantity-total">Total €{total}</output>
  </FieldComposition>;
});
