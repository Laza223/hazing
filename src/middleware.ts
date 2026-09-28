import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Sin cookie de sesión de Supabase no hay nada que refrescar: se evita el
  // round-trip a Supabase Auth para el tráfico anónimo (la mayoría de las PDP).
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    return NextResponse.next();
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

  // Refresca la sesión (rota la cookie de auth si hace falta). NO redirige acá:
  // el gate real es requireAdmin()/requireCustomer() en el layout y cada server action.
  await supabase.auth.getUser();

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
