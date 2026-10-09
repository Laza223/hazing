/**
 * Solo paths internos relativos (anti open-redirect). Rechaza caracteres de
 * control (tab/CR/LF que los navegadores descartan: `/\t/evil.com` terminaría
 * como `//evil.com`), backslash (se normaliza a slash) y `//`.
 */
export function sanitizeNext(
  next: string | null | undefined,
  fallback: string,
): string {
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    // eslint-disable-next-line no-control-regex
    !/[\x00-\x1F\x7F\\]/.test(next)
  ) {
    return next;
  }
  return fallback;
}
