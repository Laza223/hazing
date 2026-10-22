export type PageItem = number | "gap";

/**
 * Ítems de la paginación: "1 2 3 4 5 … N" al principio, "1 … 4 5 6 … N" en el medio y
 * "1 … N-4 … N" al final. Hasta 7 páginas se muestran todas. Siempre aparecen la primera
 * y la última.
 */
export function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 4) return [1, 2, 3, 4, 5, "gap", totalPages];
  if (page >= totalPages - 3) {
    return [
      1,
      "gap",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, "gap", page - 1, page, page + 1, "gap", totalPages];
}
