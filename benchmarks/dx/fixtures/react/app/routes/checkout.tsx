import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CheckoutShell } from "../components";
import { readCart, type CartState } from "../cart";
export default function CheckoutRoute() {
  const [cart, setCart] = useState<CartState>({ quantity: 1, email: '' });
  useEffect(() => setCart(readCart()), []);
  return <CheckoutShell title="Checkout"><p data-checkout-summary>{cart.quantity} × Evidence Tote for {cart.email || 'guest'}</p><Link to="/">Back to product</Link></CheckoutShell>;
}
