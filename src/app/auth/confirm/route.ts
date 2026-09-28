import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeCartForCurrentCustomer } from "@/app/(storefront)/ingresar/actions";
import { sanitizeNext } from "@/lib/http/sanitize-next";

/**
 * Confirmación de email / recuperación de contraseña vía OTP (`token_hash`) —
 * INDEPENDIENTE DEL DISPOSITIVO.
 *
 * A diferencia del flujo PKCE de `/auth/callback` (que exige la cookie
 * `code_verifier` del MISMO navegador que inició el registro y falla con
 * "both auth code and code verifier should be non-empty" si la clienta abre el
 * link en otro dispositivo), `verifyOtp` canjea el `token_hash` del email sin
 * depender de ninguna cookie previa, así que funciona aunque se registre en
 * desktop y confirme en el celular.
 *
 * Plantillas de email en Supabase (Authentication → Email Templates):
 *   - "Confirm signup": {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 *   - "Reset password": {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/cuenta/nueva-contrasena
 */

// Subconjunto de EmailOtpType de @supabase/supabase-js (estructuralmente
// asignable a verifyOtp); validar acá sanea el query param `type`.
// `recovery` solo se acepta cuando `next` apunta a la pantalla de cambio de
// contraseña — cualquier otro `next` con `type=recovery` aterrizaría con
// sesión viva en una pantalla sin UX dedicada para cambiar la contraseña.
const EMAIL_OTP_TYPES = [
  "signup",
  "email_change",
  "email",
  "recovery",
] as const;
type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

function parseOtpType(value: string | null): EmailOtpType | null {
  return EMAIL_OTP_TYPES.includes(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));
  const next = sanitizeNext(searchParams.get("next"), "/cuenta");

  if (type === "recovery" && next !== "/cuenta/nueva-contrasena") {
    return NextResponse.redirect(`${origin}/ingresar?error=auth`);
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      if (type !== "recovery") await mergeCartForCurrentCustomer();
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/ingresar?error=auth`);
}
