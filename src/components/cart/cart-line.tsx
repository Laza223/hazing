"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { formatPrice } from "@/lib/money";
import { QuantityStepper } from "@/components/catalog/quantity-stepper";
import {
  updateCartItemAction,
  removeCartItemAction,
} from "@/app/(storefront)/actions";

export interface CartLineViewItem {
  id: string;
  name: string;
  variantName: string;
  unitPrice: number;
  qty: number;
  /** Stock real de la variante — el stepper nunca deja pedir más que esto. */
  stock: number;
  imageSrc: string | null;
}

/** CartLine — línea de `/carrito` con stepper y quitar (docs/spec/06-storefront.md §3.6). */
export function CartLine({ item }: { item: CartLineViewItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const setQty = (qty: number) =>
    startTransition(async () => {
      const res = await updateCartItemAction(item.id, qty);
      setNotice(res.notice ?? null);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      await removeCartItemAction(item.id);
      router.refresh();
    });

  return (
    <div
      data-pending={pending ? "" : undefined}
      className="flex gap-4 border-b border-line py-4 last:border-b-0"
    >
      <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden border border-line-2 bg-paper-2">
        {item.imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnail chico, mismo criterio que ProductTile.
          <img
            src={item.imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-ink">{item.name}</p>
            <p className="text-xs text-ink-3">{item.variantName}</p>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Quitar del carrito"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-ink-3 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <QuantityStepper
            initial={item.qty}
            max={item.stock}
            onChange={setQty}
          />
          <span className="text-sm tabular-nums text-ink">
            {formatPrice(item.unitPrice * item.qty)}
          </span>
        </div>
        {notice && <p className="text-xs text-ink-2">{notice}</p>}
      </div>
    </div>
  );
}
