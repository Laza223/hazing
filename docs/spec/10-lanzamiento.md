# 10 — Cierre para vender (Fase 10)

**Estado:** en curso desde 2026-09-28 · Fuentes: pedido de Lazar del 2026-09-28, handoff §6 Fase 10, ADR [0005](../decisions/0005-deploy-en-vercel.md) y [0006](../decisions/0006-gate-de-produccion-con-deployment-checks.md).

Ya hecho antes de esta fase: dominio `hazing.store` y deploy automático por la integración Git de Vercel (funciones en `iad1`, Supabase en `ca-central-1`).

## 1. Checklist técnico

| Ítem | Estado |
|---|---|
| `robots.txt` y `sitemap.xml` | ✅ commit `7b8b29b` (excluye admin, cuenta, checkout, carrito, api, auth, ingresar) |
| Gate de producción (job `deploy` vs Deployment Checks) | Propuesta en ADR 0006: Deployment Checks con `quality`, sin job `deploy`. Espera OK de Lazar |
| `RESEND_OWNER_EMAIL` | Si falta, el aviso a la dueña ahora deja `console.error` en los logs (antes se omitía en silencio). La variable la carga Lazar |
| Rate limit en acciones públicas (arrepentimiento, reseñas, login) | Pendiente de decisión (ver §3) |
| Supabase Auth: Site URL y Redirect URLs a hazing.store | Lo carga Lazar (valores en §2) |
| PostHog | glamify usa `posthog-js`: es dependencia nueva, espera OK |
| E2E + axe + Lighthouse sobre el build de producción | E2E + axe: 60/60 + 2 salteados (2026-09-28). Lighthouse: pendiente |
| Zonas de envío | **Bloqueante**: 0 filas en `ShippingZone` en producción → ningún CP cotiza. Fase 9 |

## 2. Configuración que carga Lazar

- **Supabase → Authentication → URL Configuration:** Site URL `https://www.hazing.store`; Redirect URLs `https://www.hazing.store/auth/**` y `http://localhost:3000/auth/**` (más 3001/3002 para desarrollo).
- **Supabase → Email Templates:** "Confirm signup" → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`; "Reset password" → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/cuenta/nueva-contrasena`. "Confirm email" del provider Email: ON.
- **Supabase → Authentication → SMTP:** Resend (el SMTP de Supabase tiene un límite muy bajo de mails por hora).
- **Supabase → Storage:** bucket `product-images` público, 5 MB, `image/jpeg, image/png, image/webp, image/avif`.
- **Vercel → Environment Variables (Production):** `NEXT_PUBLIC_APP_URL=https://www.hazing.store`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_OWNER_EMAIL`, `CRON_SECRET`, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` **reales** (el día del lanzamiento).
- **MercadoPago → Tu aplicación → Webhooks:** `https://www.hazing.store/api/webhooks/mercadopago`, evento "Pagos"; la clave secreta es `MP_WEBHOOK_SECRET`.
- **Vercel → Settings → Build and Deployment → Deployment Checks:** check `quality` (si se aprueba el ADR 0006).

## 3. Rate limit — opciones

Sin dependencias nuevas, las alternativas reales son: (a) tabla `RateLimit` en Postgres con upsert atómico por clave `acción:IP` y ventana (necesita una migración); (b) reglas de rate limit del Firewall de Vercel sobre los POST de esas rutas (configuración en el dashboard, sin código); (c) límite en memoria por instancia (no sirve en serverless: cada instancia cuenta aparte). Recomendación: (a), porque queda versionado y testeado. La migración se coordina con la de `weightGr` de la Fase 9 para no generar dos migraciones cruzadas desde sesiones distintas.

Riesgo anotado: login, registro y recuperación llaman a Supabase Auth **desde el servidor**, así que Supabase ve la IP de Vercel y no la de la clienta: sus límites por IP los comparten todas las clientas. Con tráfico normal no llega; si aparece un "demasiados intentos" masivo, esa es la causa.

## 4. Día del lanzamiento (orden)

1. Dana carga categorías reales, zonas de envío y umbral de envío gratis desde el admin (usuaria owner ya creada).
2. `pnpm db:seed:clean` (borra solo `demo-*`; pide confirmar el host por terminal).
3. Dana carga los productos reales con fotos.
4. Credenciales reales de MP en Vercel (Production) + webhook apuntando a producción; redeploy.
5. Compra real de monto mínimo con tarjeta propia → verificar `paid`, stock descontado, mails a la clienta y a la dueña → reembolso manual desde MP.
6. Verificar que `/sitemap.xml` ya no lista productos `demo-*`.

## 5. Ledger de delegaciones

- 2026-09-28 · en la sesión principal: robots/sitemap (port de glamify, test de `absoluteUrl`), ADR 0006 con la documentación de Deployment Checks verificada, logs de configuración de Resend faltante.
