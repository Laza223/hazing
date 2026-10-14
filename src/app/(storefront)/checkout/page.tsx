import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCartView } from "@/lib/cart/cart-view";
import { getCustomer } from "@/lib/customer/auth";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/app/(storefront)/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

/**
 * CheckoutPage — una sola página, sin pasos (docs/spec/08-checkout.md §3.1).
 * Clienta logueada: nombre/email/teléfono prellenados y su dirección
 * `isDefault` precargada. Invitada: form vacío, la compra queda en `Order`
 * sin cuenta asociada.
 */
export default async function CheckoutPage() {
  const { cart, count, subtotal, coupon, couponRejected } = await getCartView();
  if (!cart || count === 0) redirect("/carrito");

  const customer = await getCustomer();
  const [profile, defaultAddress] = customer
    ? await Promise.all([
        prisma.customer.findUnique({
          where: { id: customer.id },
          select: { phone: true },
        }),
        prisma.address.findFirst({
          where: { customerId: customer.id, isDefault: true },
        }),
      ])
    : [null, null];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-10">
      <h1 className="font-display text-2xl text-ink">Finalizá tu compra</h1>
      <CheckoutForm
        subtotal={subtotal}
        discount={coupon?.discount ?? 0}
        couponCode={coupon?.code ?? null}
        couponRejected={couponRejected}
        couponFreeShipping={coupon?.freeShipping ?? false}
        defaultName={customer?.name ?? ""}
        defaultEmail={customer?.email ?? ""}
        defaultPhone={profile?.phone ?? ""}
        defaultAddress={
          defaultAddress
            ? {
                province: defaultAddress.province,
                cp: defaultAddress.postalCode,
                city: defaultAddress.city,
                street: defaultAddress.street,
                number: defaultAddress.number,
                floorApt: defaultAddress.floorApt ?? "",
                notes: defaultAddress.notes ?? "",
              }
            : null
        }
        items={cart.items.map((item) => ({
          id: item.id,
          name: item.variant.product.name,
          variantName: item.variant.name,
          qty: item.qty,
          unitPrice: getEffectivePrice(item.variant.product, item.variant),
        }))}
      />
    </div>
  );
}
