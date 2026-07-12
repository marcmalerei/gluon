import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/product";
import { CheckoutShell, PrimitiveButton, QuantityControl, type QuantityControlHandle } from "../components";
import { readCart, writeCart } from "../cart";
import { hmrMarker } from "../hmr-marker";

const product = { sku: "GL-107", name: "Evidence Tote", unitPrice: 24 } as const;
export function meta({}: Route.MetaArgs) { return [{ title: "DX checkout fixture" }]; }
export default function ProductRoute() {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const control = useRef<QuantityControlHandle>(null);
  useEffect(() => { const saved = readCart(); setQuantity(saved.quantity); setEmail(saved.email); setHydrated(true); }, []);
  function persist(next = { quantity, email }) { writeCart(next); }
  return <CheckoutShell title={product.name}>
    <p data-client-ready={hydrated}>Production-valid comparator flow · <span data-hmr-marker>{hmrMarker}</span></p>
    <label className="field"><span>Email</span><input type="email" value={email} onInput={(event) => {
      const next = event.currentTarget.value; setEmail(next); persist({ quantity, email: next });
    }} /></label>
    <QuantityControl ref={control} product={product} initialValue={quantity} onQuantityChange={(next) => {
      setQuantity(next); persist({ quantity: next, email }); return true;
    }} />
    <div className="actions">
      <PrimitiveButton variant="purchase" data-analytics="add" onClick={() => { persist(); navigate('/checkout'); }}>Add to bag</PrimitiveButton>
      <PrimitiveButton variant="danger" onClick={() => { setQuantity(1); persist({ quantity: 1, email }); control.current?.focus(); }}>Reset</PrimitiveButton>
    </div>
  </CheckoutShell>;
}
