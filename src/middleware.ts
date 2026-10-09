import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isAdminGatedPath } from "@/lib/admin/route-gate";

export async function middleware(request: NextRequest) {
  const gated = isAdminGatedPath(request.nextUrl.pathname);
  const toLogin = () =>
    NextResponse.redirect(new URL("/admin/login", request.url));

  // Sin cookie de sesión de Supabase no hay nada que refrescar: se evita el
  // round-trip a Supabase Auth para el tráfico anónimo (la mayoría de las PDP).
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    return gated ? toLogin() : NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options }),
          );
        },
      },
    },
  );

  // Refresca la sesión (rota la cookie de auth si hace falta). Solo redirige
  // /admin/** sin usuario (segunda capa); el gate real, con rol, es
  // requireAdmin()/requireCustomer() en cada page, layout y server action.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (gated && !user) return toLogin();

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cuenta/:path*",
    "/auth/:path*",
    "/ingresar",
    "/producto/:path*",
  ],
};
