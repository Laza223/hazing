import type { ReactNode } from "react";

import { BrandEntrance } from "@/components/layout/brand-entrance";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MotionProvider } from "@/lib/motion/motion-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartDrawerSummary } from "@/components/cart/cart-drawer-summary";
import { getCartView } from "@/lib/cart/cart-view";
import { getCategoryTree } from "@/lib/catalog/queries";
import { filterVisibleInNav } from "@/lib/catalog/categories";

/**
 * Layout del storefront (grupo de ruta) — chrome de Header/Footer/BrandEntrance
 * separado del root layout, que es compartido con el futuro admin (Fase 7).
 * Ver docs/spec/05-direccion-arte.md §13 (sub-fase 5.1) y
 * docs/spec/06-storefront.md §3.6 (carrito: `CartProvider` + `CartDrawer`).
 */
export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ lines, count }, tree] = await Promise.all([
    getCartView(),
    getCategoryTree(),
  ]);
  const menuCategories = filterVisibleInNav(tree);
  const initialLines = lines.map((l) => ({
    id: l.id,
    refId: l.refId,
    productId: l.productId ?? null,
    qty: l.qty,
  }));

  return (
    <MotionProvider>
      <CartProvider initialLines={initialLines} initialCount={count}>
        <BrandEntrance />
        <Header categories={menuCategories} />
        <main>{children}</main>
        <Footer />
        <CartDrawer>
          <CartDrawerSummary />
        </CartDrawer>
      </CartProvider>
    </MotionProvider>
  );
}
