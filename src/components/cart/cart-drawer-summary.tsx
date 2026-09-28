import Link from "next/link";

import { getCartView } from "@/lib/cart/cart-view";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { formatPrice } from "@/lib/money";
import { productImageUrl } from "@/lib/images";
import { buttonVariants } from "@/components/ui/button";
import { EmptyCart } from "@/components/cart/empty-cart";
import { cn } from "@/lib/utils";

/**
 * CartDrawerSummary — contenido del `CartDrawer` (docs/spec/06-storefront.md
 * §3.6): "resumen mínimo" — línea(s), subtotal, "Ver carrito" y "Finalizar
 * compra" (Fase 8). Sin cupón: eso vive en `/carrito`.
 */
export async function CartDrawerSummary() {
  const { cart, subtotal } = await getCartView();
  if (!cart || cart.items.length === 0) return <EmptyCart />;

  return (
    <div className="flex h-full flex-col gap-6">
      <ul className="flex-1 space-y-4 overflow-y-auto">
        {cart.items.map((item) => {
          const imageSrc = productImageUrl(
            item.variant.image ?? item.variant.product.images[0] ?? null,
          );
          return (
            <li key={item.id} className="flex gap-3">
              <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden border border-line-2 bg-paper-2">
                {imageSrc && (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail chico, mismo criterio que ProductTile.
                  <img
                    src={imageSrc}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  {item.variant.product.name}
                </p>
                <p className="text-xs text-ink-3">{item.variant.name}</p>
                <p className="mt-1 text-xs tabular-nums text-ink-2">
                  {/* Precio vigente, NO el snapshot al agregar (punto 1 de la revisión). */}
                  {item.qty} ×{" "}
                  {formatPrice(
                    getEffectivePrice(item.variant.product, item.variant),
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-4 border-t border-line pt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink-2">Subtotal</span>
          <span className="tabular-nums text-ink">{formatPrice(subtotal)}</span>
        </div>
        <Link href="/checkout" className={cn(buttonVariants(), "w-full")}>
          Finalizar compra
        </Link>
        <Link
          href="/carrito"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Ver carrito
        </Link>
      </div>
    </div>
  );
}
