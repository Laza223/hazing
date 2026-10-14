import type { Metadata } from "next";
import Link from "next/link";

import { getCartView } from "@/lib/cart/cart-view";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { round2 } from "@/lib/money";
import { productImageUrl } from "@/lib/images";
import { CartLine } from "@/components/cart/cart-line";
import { CartSummary } from "@/components/cart/cart-summary";
import { CouponForm } from "@/components/cart/coupon-form";
import { FreeShippingLine } from "@/components/cart/free-shipping-line";
import { EmptyCart } from "@/components/cart/empty-cart";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tu carrito" };

/**
 * CarritoPage — página completa del carrito (docs/spec/06-storefront.md
 * §3.6, handoff §8.7: mobile-first, el drawer no reemplaza la página).
 * "Finalizar compra" lleva a `/checkout` (Fase 8).
 */
export default async function CarritoPage() {
  const { cart, subtotal, count, threshold, coupon, couponRejected } =
    await getCartView();

  if (!cart || count === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-10">
        <h1 className="font-display text-2xl text-ink">Tu carrito</h1>
        <EmptyCart />
      </div>
    );
  }

  const discount = coupon?.discount ?? 0;
  const total = round2(subtotal - discount);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-10">
      <h1 className="font-display text-2xl text-ink">Tu carrito ({count})</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {cart.items.map((item) => (
            <CartLine
              key={item.id}
              item={{
                id: item.id,
                name: item.variant.product.name,
                variantName: item.variant.name,
                // Precio vigente, NO el snapshot al agregar (revisión de código,
                // punto 1): línea × cantidad tiene que dar el subtotal/total real.
                unitPrice: getEffectivePrice(
                  item.variant.product,
                  item.variant,
                ),
                qty: item.qty,
                stock: item.variant.stock,
                imageSrc: productImageUrl(
                  item.variant.image ?? item.variant.product.images[0] ?? null,
                ),
              }}
            />
          ))}
        </div>

        <aside className="space-y-6 lg:col-span-5">
          <FreeShippingLine subtotal={subtotal} threshold={threshold} />
          <CouponForm
            applied={coupon?.code ?? null}
            rejected={couponRejected}
          />
          <CartSummary subtotal={subtotal} discount={discount} total={total} />
          <Link href="/checkout" className={cn(buttonVariants(), "w-full")}>
            Finalizar compra
          </Link>
        </aside>
      </div>
    </div>
  );
}
