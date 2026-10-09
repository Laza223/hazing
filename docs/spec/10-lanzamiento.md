# 10 — Cierre para vender (Fase 10)

**Estado:** en curso desde 2026-09-28 · Fuentes: pedido de Lazar del 2026-09-28, handoff §6 Fase 10, ADR [0005](../decisions/0005-deploy-en-vercel.md) y [0006](../decisions/0006-gate-de-produccion-con-deployment-checks.md).

Ya hecho antes de esta fase: dominio `hazing.store` y deploy automático por la integración Git de Vercel (funciones en `iad1`, Supabase en `ca-central-1`).

## 1. Checklist técnico

| Ítem | Estado |
|---|---|
| `robots.txt` y `sitemap.xml` | ✅ commit `7b8b29b` (excluye admin, cuenta, checkout, carrito, api, auth, ingresar) |
| Gate de producción (job `deploy` vs Deployment Checks) | Aprobado (ADR 0006, 2026-09-29): Deployment Checks con `quality`, sin job `deploy`. Check `quality` cargado en Vercel el 2026-09-29; falta probarlo con el primer push |
| `RESEND_OWNER_EMAIL` | Si falta, el aviso a la dueña ahora deja `console.error` en los logs (antes se omitía en silencio). La variable la carga Lazar |
| Rate limit en acciones públicas (arrepentimiento, reseñas, login) | Aprobado (tabla `RateLimit` en Postgres, §3); migración `20260929150847_rate_limit` aplicada en Supabase con RLS; ✅ implementado (2026-09-29): login, registro, recuperar contraseña, login admin, reseñas, arrepentimiento, checkout y cupón; ver §3 |
| Supabase Auth: Site URL, Redirect URLs y templates de Confirm signup / Reset password | ✅ cargado y verificado tras recargar (2026-09-29); "Confirm email" ON. Siguen en inglés los textos de los templates y falta el SMTP de Resend (Lazar) |
| PostHog | **Diferido** (2026-09-29): no hace falta para vender; los puntos `begin_checkout`/`purchase` quedan marcados en el código. Se decide con tráfico real (ver la pregunta de cookies y consentimiento, Ley 25.326) |
| E2E + axe + Lighthouse sobre el build de producción | E2E + axe: 60/60 + 2 salteados (2026-09-28). Lighthouse: pendiente |
| Zonas de envío | Provisorio (2026-09-29): un solo precio para todo el país en Ajustes; **hay que cargarlo antes de vender** (hoy 0 filas en `ShippingZone` en producción). El diseño final es la sesión de envíos: ver [09-envios.md](09-envios.md) |

## 2. Configuración que carga Lazar

- **Supabase → Authentication → URL Configuration:** Site URL `https://www.hazing.store`; Redirect URLs `https://www.hazing.store/auth/**` y `http://localhost:3000/auth/**` (más 3001/3002 para desarrollo).
- **Supabase → Email Templates:** "Confirm signup" → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`; "Reset password" → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/cuenta/nueva-contrasena`. "Confirm email" del provider Email: ON.
- **Supabase → Authentication → SMTP:** Resend (el SMTP de Supabase tiene un límite muy bajo de mails por hora).
- **Supabase → Storage:** bucket `product-images` — ✅ creado el 2026-09-29 por SQL (público, 5 MB, `image/jpeg, image/png, image/webp, image/avif`).
- **Vercel → Environment Variables (Production):** `NEXT_PUBLIC_APP_URL=https://www.hazing.store`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_OWNER_EMAIL`, `CRON_SECRET`, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` **reales** (el día del lanzamiento).
- **MercadoPago → Tu aplicación → Webhooks:** `https://www.hazing.store/api/webhooks/mercadopago`, evento "Pagos"; la clave secreta es `MP_WEBHOOK_SECRET`.
- **Vercel → Settings → Build and Deployment → Deployment Checks:** check `quality` (si se aprueba el ADR 0006).

## 3. Rate limit — implementado (2026-09-29)

Tabla `RateLimit` en Postgres (migración `20260929150847_rate_limit`, con RLS), upsert atómico `INSERT ... ON CONFLICT` en `src/lib/rate-limit/index.ts`. Ventana fija por `acción:IP`. Topes: login 30 / 15 min · signup 15 / h · recuperar contraseña 10 / h · reseña 10 / h · arrepentimiento 20 / h (derecho legal: generoso) · login admin 10 / 15 min · checkout 20 / h · cupón 30 / 15 min. Los topes son altos a propósito: los datos móviles argentinos comparten IP entre cientos de personas.

Decisiones de diseño (revisión adversarial con contexto fresco):

- **Fail-open**: si la base falla o tarda más de 1,5 s, se permite y se loguea. Un rate limit caído no puede dejar sin login a todas.
- **Solo actúa en Vercel** (`process.env.VERCEL`): ahí el borde sobreescribe `x-forwarded-for` (doc oficial) y la IP no es falsificable. En local y en los E2E no limita ni escribe filas.
- **IPv6 se agrupa por /64**: si no, quien tiene un /64 rota 2^64 direcciones.
- El honeypot de reseñas y arrepentimiento no consume cupo.
- La purga la hace el cron horario (filas de más de 24 h).
- Verificado contra Postgres real: 20 llamadas concurrentes dan contadores sin repetidos; hay un test de integración opcional (`RATE_LIMIT_TEST_DB_URL`).

Límites conocidos: es por IP, no por cuenta (un ataque distribuido contra una cuenta lo cubre Supabase Auth); no se limita el carrito (crear carritos sin techo, riesgo bajo); login, registro y recuperación llaman a Supabase Auth desde el servidor, así que Supabase ve la IP de Vercel y sus límites por IP los comparten todas.

## 4. Día del lanzamiento (orden)

1. Dana carga categorías reales, zonas de envío y umbral de envío gratis desde el admin (usuaria owner ya creada).
2. `pnpm db:seed:clean` (borra solo filas `demo-*`: productos y categorías demo vacías; nunca categorías ni SKUs reales; pide confirmar el host por terminal).
3. Dana carga los productos reales con fotos.
4. Credenciales reales de MP en Vercel (Production) + webhook apuntando a producción; redeploy.
5. Compra real de monto mínimo con tarjeta propia → verificar `paid`, stock descontado, mails a la clienta y a la dueña → reembolso manual desde MP.
6. Verificar que `/sitemap.xml` ya no lista productos `demo-*`.

## 5. Ledger de delegaciones

- 2026-09-29 · rate limit (Sonnet, ~135 k tokens en dos tandas): implementación + revisión adversarial independiente (~56 k tokens, aprobada con reservas, sin críticos) → IPv6 por /64, timeout fail-open, cableado de checkout y cupón, topes relajados, tests de cableado de las 8 acciones. Migración y SQL verificados en la sesión principal.
- 2026-09-28 · en la sesión principal: robots/sitemap (port de glamify, test de `absoluteUrl`), ADR 0006 con la documentación de Deployment Checks verificada, logs de configuración de Resend faltante.
