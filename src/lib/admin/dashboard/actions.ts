/**
 * Funciones puras de la bandeja de acción de Inicio (antigüedades y vencimientos).
 * Sin DB: reciben `now` para poder testearse con un instante fijo.
 */

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** Cupones activos que vencen dentro de esta ventana (o ya vencieron) aparecen en Inicio. */
export const COUPON_WARNING_DAYS = 7;

/** Antigüedad legible: "hace instantes", "hace 3 h", "hace 2 días". */
export function formatAge(from: Date, now: Date): string {
  const diff = Math.max(0, now.getTime() - from.getTime());
  if (diff < HOUR_MS) return "hace menos de 1 h";
  if (diff < DAY_MS) return `hace ${Math.floor(diff / HOUR_MS)} h`;
  const days = Math.floor(diff / DAY_MS);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/** Horas que le quedan a un pedido sin pagar antes del autocancel (puede ser <= 0). */
export function hoursUntilExpiry(
  createdAt: Date,
  now: Date,
  hours = 24,
): number {
  return (createdAt.getTime() + hours * HOUR_MS - now.getTime()) / HOUR_MS;
}

/** "Se cancela en 5 h" / "Se cancela en menos de 1 h" / ya pasado el plazo (lo levanta el cron horario). */
export function describeOrderExpiry(hoursLeft: number): string {
  if (hoursLeft <= 0) return "Vencido: se cancela en la próxima corrida";
  if (hoursLeft < 1) return "Se cancela en menos de 1 h";
  return `Se cancela en ${Math.floor(hoursLeft)} h`;
}

/** "Vence en 3 días" / "Vence hoy" (en las próximas 24 h) / "Venció hace 2 días". */
export function describeCouponDeadline(validTo: Date, now: Date): string {
  const diff = validTo.getTime() - now.getTime();
  if (diff < 0) {
    const days = Math.floor(-diff / DAY_MS);
    if (days === 0) return "Venció hoy";
    return days === 1 ? "Venció hace 1 día" : `Venció hace ${days} días`;
  }
  const days = Math.ceil(diff / DAY_MS);
  if (days <= 1) return "Vence hoy";
  return `Vence en ${days} días`;
}

/** Corte superior de `validTo` para que un cupón entre en el aviso. */
export function couponWarningCutoff(now: Date): Date {
  return new Date(now.getTime() + COUPON_WARNING_DAYS * DAY_MS);
}
