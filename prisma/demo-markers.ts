/**
 * Marca inequívoca de filas de demo. El seed solo escribe filas que pasan estos
 * chequeos y el cleanup solo borra filas que los pasan: nunca por coincidencia
 * con slugs/SKUs de catálogo real.
 */
export const DEMO_SLUG_PREFIX = "demo-";

export function isDemoSlug(slug: string): boolean {
  return slug.startsWith(DEMO_SLUG_PREFIX);
}

/** Los prefijos de SKU demo empiezan con "D" (reales: TOP, BOD, REM, JEA, SHO). */
export function isDemoSkuPrefix(prefix: string): boolean {
  return /^D[A-Z]{2}$/.test(prefix);
}
