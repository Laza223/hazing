import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * EmptyCart — estado vacío (drawer y `/carrito`). Sin íconos de colores ni
 * urgencia falsa (CLAUDE.md): solo texto y un link a la tienda.
 */
export function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-sm text-ink-2">Tu carrito está vacío.</p>
      <Link
        href="/tienda"
        className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
      >
        Ir a la tienda
      </Link>
    </div>
  );
}
