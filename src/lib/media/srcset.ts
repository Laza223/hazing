/**
 * Helpers puros para armar `srcset`/`sizes` de assets de campaña pre-codificados
 * por scripts/encode-images.mjs (ver docs/spec/05-direccion-arte.md §10).
 *
 * Ese script escribe, para cada asset, 4 anchos x 2 formatos con la convención
 * `<basePath>-<ancho>.<formato>` (ej: "/media/hero/campana-640.avif"). Este módulo
 * no toca el filesystem ni depende de sharp: solo arma los strings que va a leer
 * un <source>/<img> — así se puede testear sin la dependencia de build.
 */

/** Anchos de pre-codificación (§10). MISMA lista que WIDTHS en
 * scripts/encode-images.mjs — si una cambia, cambiar la otra a mano. */
export const CAMPAIGN_WIDTHS = [640, 1080, 1600, 2400] as const;

export type CampaignWidth = (typeof CAMPAIGN_WIDTHS)[number];

export type ImageFormat = "avif" | "webp";

/**
 * Arma el string de `srcset` para un asset pre-codificado: una entrada por ancho,
 * en el orden dado, con el nombre `<basePath>-<ancho>.<formato> <ancho>w`.
 *
 * `basePath` es la ruta pública SIN extensión (ej: "/media/hero/campana-2026"),
 * la misma que produce encode-images.mjs a partir del nombre del archivo source.
 */
export function buildSrcSet(
  basePath: string,
  format: ImageFormat,
  widths: readonly number[] = CAMPAIGN_WIDTHS,
): string {
  if (basePath.trim() === "") {
    throw new Error("buildSrcSet: basePath vacío");
  }
  if (widths.length === 0) {
    throw new Error("buildSrcSet: widths vacío");
  }
  return widths
    .map((width) => `${basePath}-${width}.${format} ${width}w`)
    .join(", ");
}

/** Un breakpoint de `sizes`: a partir de `minWidth` (px) de viewport, el slot mide `slot`. */
export interface SizesBreakpoint {
  minWidth: number;
  slot: string;
}

/**
 * Arma el atributo `sizes` a partir de breakpoints ordenados de más a menos
 * específico (el navegador usa el primero cuyo `min-width` matchea), más un
 * `fallback` final sin condición para viewports más chicos que todos los breakpoints.
 *
 * buildSizes([{ minWidth: 1024, slot: "50vw" }], "100vw")
 *   -> "(min-width: 1024px) 50vw, 100vw"
 */
export function buildSizes(
  breakpoints: readonly SizesBreakpoint[],
  fallback: string,
): string {
  const parts = breakpoints.map(
    (bp) => `(min-width: ${bp.minWidth}px) ${bp.slot}`,
  );
  parts.push(fallback);
  return parts.join(", ");
}
