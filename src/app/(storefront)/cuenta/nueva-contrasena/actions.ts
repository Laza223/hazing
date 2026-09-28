"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/forms/action-result";

/**
 * Cambio de contraseña tras el link de recuperación
 * (`/auth/confirm?type=recovery&next=/cuenta/nueva-contrasena`): la sesión ya
 * está en la cookie por el `verifyOtp` del Route Handler. Server Action para no
 * cargar el cliente browser de Supabase en esta página.
 */
export async function updatePasswordAction(
  password: string,
): Promise<ActionResult> {
  if (password.length < 8)
    return {
      ok: false,
      error: "La contraseña tiene que tener al menos 8 caracteres.",
    };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    return {
      ok: false,
      error: "No se pudo actualizar la contraseña. Pedí un nuevo link.",
    };
  return { ok: true };
}
