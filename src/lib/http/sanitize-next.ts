/**
 * Solo paths internos relativos (anti open-redirect). Rechaza `//` y `\` (los
 * navegadores normalizan backslash a slash, así que `/\evil.com` se
 * comportaría como `//evil.com` si el origin no antecediera).
 */
export function sanitizeNext(
  next: string | null | undefined,
  fallback: string,
): string {
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\")
  ) {
    return next;
  }
  return fallback;
}
