/** Pura: /admin/** requiere sesión salvo /admin/login. Segunda capa; el rol lo chequea requireAdmin(). */
export function isAdminGatedPath(pathname: string): boolean {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return false;
  return pathname !== "/admin/login" && !pathname.startsWith("/admin/login/");
}
