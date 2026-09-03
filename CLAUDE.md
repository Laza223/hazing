# CLAUDE.md

Guía para Claude Code en este repositorio.

# Hazing

Ecommerce B2C de ropa femenina para Argentina (Luján / envíos a todo el país). Stack serverless Next.js 15 en Cloudflare Workers + Supabase Postgres vía Prisma adapter. Blanco y negro, "hiper mega premium" — ver §8 del handoff, resumido abajo.

Arquitectura calcada de `glamify-makeup` (otro ecommerce propio, en producción con plata real), con tres deltas: sin facturación en v1, envío 100% manual (sin API de courier), catálogo de ropa (talle + color en vez de tono). Fuente de verdad del producto: [`docs/spec/`](docs/spec/) (negocio → funcional → técnica → calidad, basados en `docs/spec/00-handoff.md`). Decisiones de arquitectura: [`docs/decisions/`](docs/decisions/).

## Comandos y Definition of Done

**Antes de declarar terminado cualquier cambio** — estos cuatro son lo que corre `scripts/audit-verify.sh` y el CI:

```bash
pnpm format:check   # NO `pnpm format`: ese reescribe, este falla
pnpm lint           # ESLint sobre src/
pnpm typecheck      # correr también después de cada cambio, no solo al cerrar
pnpm test           # tests unitarios y de integración con Vitest
```

Resto:

- `pnpm dev` — localhost:3000 · `pnpm dev:worker` / `preview:worker` — preview Wrangler en `:8771`
- `pnpm build` / `build:worker` · `pnpm deploy` — `build:worker` + `wrangler deploy`
- `pnpm test:watch` · `pnpm test:e2e` — Playwright E2E (`@axe-core/playwright` para a11y)
- `pnpm db:migrate` — `prisma migrate dev` (sin aplicar todavía, ver Fase 3) · `pnpm db:push` · `pnpm db:studio` · `pnpm db:seed` (se agrega cuando haya seed real)
- **CI:** GitHub Actions corre `quality` en cada push/PR a `main`. `deploy` se agrega en Fase 10.
- **Guard de escritura en DB:** `scripts/prod-write-guard.ts` (copiado de glamify) — scripts mutadores exigen tipear el host por terminal interactiva.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict · shadcn/ui + Tailwind CSS v3.4 · Vitest + Playwright
- **Deploy:** Cloudflare Workers vía `@opennextjs/cloudflare` con `nodejs_compat` (NO Vercel).
- **PostgreSQL vía Supabase** (Auth + Storage) · **Prisma ORM** con driver adapter (`@prisma/adapter-pg`) — ver [ADR 0002](docs/decisions/0002-prisma-en-workers.md) para por qué Prisma y no Drizzle (el default del stack propio) en este runtime.
- **Conexión DB por-request:** en Workers un socket TCP no se comparte entre requests — `src/lib/prisma.ts` (copiado exacto de glamify) crea el cliente por-request vía `cache()` de React + `Proxy` perezoso.
- **MercadoPago Checkout Pro:** `src/lib/payments/*` + `src/lib/orders/checkout-service.ts`/`webhook-service.ts` listos como librería (pagos instantáneos, efectivo/offline excluido, webhook con firma HMAC + idempotencia por `mpPaymentId`). El Route Handler `/api/webhooks/mercadopago` y la UI de checkout se cablean en Fase 8.
- **Envíos:** sin API (delta vs. glamify) — `src/lib/shipping/quote.ts` (módulo nuevo, no existe en glamify) cotiza SOLO contra `ShippingZone` activa por provincia/rango de CP; sin match, tira error explícito (no hay fallback). `ShipmentStatus` avanza a mano desde el admin ("marcar despachado" + tracking freeform, Fase 9).
- **Resend:** email transaccional (`src/lib/email/*`, templates con branding Hazing sin rosa/emoji) · **PostHog:** analítica (pendiente, Fase 6+) · **Cron Triggers:** en `worker.ts` (abandoned cart + order expiry, wireados).

## Arquitectura del código

Patrón: **Next.js App Router + servicios desacoplados en `src/lib/*`**. La lógica transaccional NO vive en UI ni routing.

- `src/app/(storefront)/*` — Storefront: home, `/tienda`, `/producto/[slug]`, `/carrito`, `/checkout`, `/cuenta`, `/ingresar`, `/arrepentimiento`, páginas legales/institucionales.
- `src/app/admin/*` — Panel admin: `/admin/login`, `/admin/(panel)` (`/pedidos`, `/productos`, `/categorias`, `/cupones`, `/resenas`).
- `src/app/api/*` — Route Handlers exclusivamente para webhooks (`/api/webhooks/mercadopago`), callbacks de auth, sitemap/robots.
- `src/lib/*` — Dominios: `orders/`, `payments/`, `cart/`, `catalog/`, `admin/`, `coupons/`, `email/`, `supabase/`, `prisma.ts`, `cron/`. `shipping/quote.ts` es el único archivo de `shipping/` — cotiza por `ShippingZone`, sin adapter de courier (delta vs. glamify, que tiene un módulo `shipping/` entero de MiCorreo/Zipnova que Hazing no porta). `customer/` y `reviews/` todavía no existen — se agregan cuando haga falta esa funcionalidad (Fase 6/7).
- **Guards y Auth:** Staff vía Supabase Auth → tabla `User` (`role = 'owner' | 'admin'`), `requireAdmin()` en layouts y Server Actions. Clientas vía Supabase Auth (email) → `Customer`. Compras de invitadas guardan contacto/dirección en `Order`.

## Invariantes de dominio

- **Montos en ARS con `Decimal(12,2)`** (Prisma/Decimal.js, NUNCA centavos ni float nativo). **Timestamps en UTC** en DB, conversión a ART solo en display. **UUIDs como PK** en todo (salvo `Setting.id="default"` y `RetractionRequest.seq` autoincrement).
- **ENUMs en inglés británico: `cancelled` (doble L). NUNCA `canceled`.**
- **Estados:** `OrderStatus` (`pending_payment → paid → preparing → shipped → delivered` | `cancelled` | `refunded`) · `PaymentStatus` (espejo MP) · `ShipmentStatus` (`pending → ready → dispatched → in_transit → delivered` | `returned`, transiciones manuales desde el admin).
- **SKU autogenerado:** `{PREFIJO_CATEGORIA}-{NNNN}`, prefijo 3 letras, secuencial por categoría.
- **Stock en variantes:** todo producto tiene al menos una variante. Stock vive en `ProductVariant.stock`, se descuenta al confirmar pago (`PaymentStatus.approved`) en transacción Prisma.
- **Snapshots transaccionales:** `OrderItem` snapshotea nombre, variante, SKU y precio unitario.
- **Categorías jerárquicas:** hasta 2 niveles. Origen de envío: **CP 6700 (Luján)**.
- **Legalidad AR:** Botón de Arrepentimiento (Res. 424/2020, Art. 34 Ley 24.240, constancia `ARR-NNNNNN`). Ley 25.326 de Protección de Datos Personales.

## Catálogo — talle y color (ver ADR 0001)

`Product.sizeSystem` (`letters | numeric | one_size`) elegido por producto, no por categoría. `ProductVariant.size` + `ProductVariant.color`, validados en `src/lib/admin/products/validation.ts` contra `SIZE_SCALES` de `src/lib/catalog/sizes.ts`. Par `(size, color)` único por producto. Escalas nuevas = cambio de código, no de admin.

## Vetos de producto (no reproponer)

- Efectivo/offline (Rapipago/Pago Fácil): excluido.
- Reembolsos automáticos por API: descartados — manual + registro admin.
- Emojis como íconos: prohibidos (Lucide SVG).
- Stock falso / urgencia falsa: prohibido.
- Deploy en Vercel o fuera de Cloudflare Workers: descartado salvo ADR nuevo.
- **API de envío (MiCorreo/PaqAr/Zipnova/Mercado Envíos) en v1: descartada.** Despacho 100% manual.
- **Facturación automática en v1: descartada.**
- Dark mode: a decidir como parte de la identidad de marca (no es invariante universal).

## Design system — monocromo premium (ver `docs/spec/00-handoff.md` §8)

Es el requisito de producto más importante del proyecto. Reglas verificables (no improvisar a ojo):

- **Texto:** `#171717` (ink), NUNCA `#000` puro. Escala de grises Tailwind `neutral` casi 1:1 con el brief.
- **Imágenes de producto:** `border-radius: 0`. Radio de 2-4px máximo en botones/inputs. `9999px` solo en swatches/avatares/dots.
- **Aspect ratio:** uno solo por contexto (`3/4` PDP/lookbook, `4/5` grilla de catálogo). Nunca mezclar en la misma grilla.
- **Movimiento:** micro-interacciones 150-250ms ease-in-out · imagen (zoom/scale/filter) 500-800ms `cubic-bezier(0.4, 0, 0.2, 1)` · `prefers-reduced-motion` obligatorio (opacity-only o instantáneo).
- **Tipografía:** `Inter` (UI/body/nav) + `Archivo` 700-900 (display/wordmark). Tracking 0-0.01em en sentence-case, **0.08-0.15em en MAYÚSCULAS**. Nada de Bebas Neue ni condensadas genéricas.
- **Estados sin rojo ni verde:** forma + texto comunican éxito/error/stock, nunca un badge de color (WCAG 1.4.1).
- **Anti-patrones prohibidos:** carruseles con flechas grandes, badges rojos de oferta, countdowns de urgencia, `box-shadow` marcado, más de un color no-neutral en la misma vista, mezclar ratios, easing bounce/elastic, popups de descuento al entrar.

Fase 5 implementa esto como tokens de Tailwind — hasta entonces el esqueleto usa una paleta neutral genérica de placeholder.

## Seguridad y Permisos

- **Admin:** `requireAdmin()` (`src/lib/admin/auth.ts`) chequea sesión Supabase Auth + rol `owner`/`admin` en tabla `User`.
- **MP Webhook:** `src/lib/orders/webhook-service.ts` valida firma HMAC en `x-signature`, re-consulta a la API de MP, procesa idempotentemente por `mpPaymentId`. El Route Handler que lo expone se cablea en Fase 8.
- **Secretos:** solo en Cloudflare Secrets (`wrangler secret put`) y `.env.local`. NUNCA en git ni en cliente.
- **Guard de mutación:** `scripts/prod-write-guard.ts` intercepta scripts locales para confirmar host de Supabase por terminal.

## Skill routing

| Situación                              | Gana                               |
| -------------------------------------- | ---------------------------------- |
| Tarea no trivial — SIEMPRE primero     | `protocolo-orquestacion`           |
| Feature nuevo                          | `entrega-feature`                  |
| Bug / comportamiento raro              | `superpowers:systematic-debugging` |
| Fixes de una lista de hallazgos        | `protocolo-fixes-general`          |
| Decisión de arquitectura no obvia      | `decision-arquitectura`            |
| Revisar PR / diff                      | `code-review` / `revision-pr`      |
| Verificar implementación propia        | `verificacion-fresca`              |
| Verificar flujo de UI corriendo la app | `verificacion-ux`                  |
| Cierre de esfuerzo / release           | `cierre-release`                   |

## Comunicación

Respuestas directas, sin intro ni conclusiones. Código y comandos exactos. Si hay ambigüedad o falta info, señalar/preguntar antes de inventar — usar formato "REQUIERE INPUT" para decisiones de negocio no contempladas en `docs/spec/`.

## Guardrails

**SIEMPRE**

- Correr `format:check`, `lint`, `typecheck`, `test` antes de decir "listo". Al declarar verde, citar el output real.
- TypeScript strict sin excepciones. Server Actions para mutaciones UI; Route Handlers solo para webhooks MP, auth callbacks y sitemap/robots. Queries a DB solo desde Server Components o Server Actions vía `prisma` por-request.

**PREGUNTAR ANTES**

- Decisiones de negocio no contempladas en `docs/spec/` (reportar como "REQUIERE INPUT" con pregunta numerada). Eliminar código, tablas o alterar carpetas.

**NUNCA**

- `any` (usar `unknown` + type guards). Commitear o pushear a `main` directamente sin que Lazar lo pida. Modificar una migración ya aplicada. Inventar nombres de tablas/columnas/rutas. Hardcodear credenciales o URLs de prod. Agregar dark mode, emojis o contadores de urgencia falsos sin decisión explícita. Editar `scripts/audit-verify.sh` como parte de un fix. Reproponer API de envío o facturación automática en v1.

## Git

Cuenta de GitHub: **pendiente** — se completa cuando exista el repo de la dueña (ver `SETUP.md` §1). Hasta entonces, sin remote configurado.

## Compact Instructions

Al resumir: preservar cambios de schema Prisma/APIs, errores y soluciones exactas, archivos modificados, decisiones arquitectónicas (ADRs) y estado de la fase en curso (ver `docs/spec/00-handoff.md` §6, plan de 10 fases). Resumir brevemente intentos fallidos y debates concluidos.
