/**
 * Resultado uniforme de toda Server Action del panel admin.
 * `ok:false` siempre trae `error` legible para la dueña; `ok:true` puede traer
 * el `id` del registro creado/editado para redirigir.
 */
export interface AdminResult {
  ok: boolean;
  error?: string;
  id?: string;
  /** Solo despacho: `false` si el registro se guardó pero el mail a la clienta no salió. */
  emailSent?: boolean;
}
