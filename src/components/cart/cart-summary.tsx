import { formatPrice } from "@/lib/money";

export interface CartSummaryProps {
  subtotal: number;
  discount: number;
  total: number;
}

/**
 * CartSummary — subtotal/descuento/total, ya resueltos a `number` en el
 * server (ver src/lib/money.ts, src/lib/cart/totals.ts — nunca float nativo
 * en el cálculo, `Decimal` hasta acá). El envío no entra: se calcula en el
 * checkout (Fase 8).
 */
export function CartSummary({ subtotal, discount, total }: CartSummaryProps) {
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
      <div className="flex justify-between border-t border-line pt-2 text-base">
        <dt className="text-ink">Total</dt>
        <dd className="tabular-nums text-ink">{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}
