import { formatPrice } from "@/lib/money";

export interface CartSummaryProps {
  subtotal: number;
  discount: number;
  total: number;
  /** `undefined` = no se muestra la línea de envío (carrito, antes del checkout).
   *  `null` = todavía no se calculó. Objeto = costo ya calculado (Fase 8). */
  shipping?: { cost: number; free: boolean } | null;
}

/**
 * CartSummary — subtotal/descuento/envío/total, ya resueltos a `number` en
 * el server (ver src/lib/money.ts, src/lib/cart/totals.ts — nunca float
 * nativo en el cálculo, `Decimal` hasta acá).
 */
export function CartSummary({
  subtotal,
  discount,
  total,
  shipping,
}: CartSummaryProps) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-2">Subtotal</dt>
        <dd className="tabular-nums text-ink">{formatPrice(subtotal)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-ink-2">Descuento</dt>
          <dd className="tabular-nums text-ink">−{formatPrice(discount)}</dd>
        </div>
      )}
      {shipping !== undefined && (
        <div className="flex justify-between">
          <dt className="text-ink-2">Envío</dt>
          <dd className="tabular-nums text-ink">
            {shipping === null
              ? "A calcular"
              : shipping.free
                ? "Gratis"
                : formatPrice(shipping.cost)}
          </dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-2 text-base">
        <dt className="text-ink">Total</dt>
        <dd className="tabular-nums text-ink">{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}
