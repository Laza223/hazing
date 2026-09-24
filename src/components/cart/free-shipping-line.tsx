import { formatPrice } from "@/lib/money";

export interface FreeShippingLineProps {
  subtotal: number;
  /** null = sin umbral configurado todavía (`Setting.freeShippingThreshold`) — no se muestra nada. */
  threshold: number | null;
}

/**
 * FreeShippingLine — docs/spec/06-storefront.md §3.7: texto informativo +
 * una regla de 1 px `ink` que avanza a medida que el subtotal se acerca al
 * umbral. Es información, no urgencia (nunca color, nunca countdown). CSS
 * puro (no GSAP): es un estado derivado del subtotal, no algo secuenciado o
 * ligado al scroll — la regla del §8 sobre reparto CSS/GSAP le corresponde a
 * CSS. `prefers-reduced-motion` ya está cubierto por la regla global de
 * `transition-duration` en globals.css.
 *
 * Hoy no hay ninguna fila en `Setting`, así que `threshold` siempre llega en
 * `null` y este componente no se ve en pantalla todavía (ver §3.7).
 */
export function FreeShippingLine({
  subtotal,
  threshold,
}: FreeShippingLineProps) {
  if (threshold == null) return null;

  const remaining = Math.max(0, threshold - subtotal);
  const reached = remaining <= 0;
  const pct = Math.min(1, subtotal / threshold);

  return (
    <div className="space-y-2 text-sm">
      <p className="text-ink-2">
        {reached
          ? "Tenés envío gratis."
          : `Te faltan ${formatPrice(remaining)} para el envío gratis.`}
      </p>
      <div
        aria-hidden="true"
        className="h-px w-full origin-left bg-ink transition-transform duration-overlay ease-out-expo"
        style={{ transform: `scaleX(${pct})` }}
      />
    </div>
  );
}
