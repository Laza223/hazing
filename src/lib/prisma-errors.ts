/** Narrow de error de unicidad de Prisma (P2002) sin acoplar tipos del client. */
export function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}
