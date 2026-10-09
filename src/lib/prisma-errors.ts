/** Narrow de error de unicidad de Prisma (P2002) sin acoplar tipos del client. */
export function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}

/** Error de Prisma/DB (cliente, query cruda o código Pxxxx): texto técnico en inglés. */
export function isDatabaseError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const code = (e as { code?: unknown }).code;
  return (
    e.name.startsWith("PrismaClient") ||
    (typeof code === "string" && /^P\d{4}$/.test(code)) ||
    /prisma\.|invocation/i.test(e.message)
  );
}

/**
 * Mensaje para la clienta: los errores de dominio (en castellano, tirados a propósito)
 * pasan tal cual; los de base de datos se loguean y se reemplazan por `fallback`.
 */
export function publicErrorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback;
  if (isDatabaseError(e)) {
    console.error("[db]", e);
    return fallback;
  }
  return e.message;
}
