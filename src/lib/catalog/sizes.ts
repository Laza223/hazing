import type { SizeSystem } from "@prisma/client";

/**
 * Escalas de talle fijas en código (no en DB) — ver docs/decisions/0001-esquema-talles.md.
 * Cambiar o agregar una escala es un cambio de código (deploy), no algo que la dueña
 * edite desde el admin.
 */
export const SIZE_SCALES: Record<SizeSystem, string[]> = {
  letters: ["XS", "S", "M", "L", "XL", "XXL"],
  numeric: ["34", "36", "38", "40", "42", "44", "46", "48", "50"],
  one_size: ["Único"],
};

/** El talle pertenece a la escala del sistema del producto. */
export function isValidSize(system: SizeSystem, size: string): boolean {
  return SIZE_SCALES[system].includes(size);
}

/**
 * Orden por posición en la escala de `system`. Talles fuera de escala (dato legado o
 * error de carga) van al final, en orden alfabético entre ellos.
 */
export function compareSizes(system: SizeSystem, a: string, b: string): number {
  const scale = SIZE_SCALES[system];
  const indexA = scale.indexOf(a);
  const indexB = scale.indexOf(b);
  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  return a.localeCompare(b, "es");
}

/** Ordena una lista de talles según la escala del sistema (ver `compareSizes`). */
export function sortSizes(system: SizeSystem, sizes: string[]): string[] {
  return [...sizes].sort((a, b) => compareSizes(system, a, b));
}
