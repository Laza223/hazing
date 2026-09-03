# 03 — Técnica

Fuente: [`00-handoff.md`](00-handoff.md) §1, §4, §6. ADRs: [0001](../decisions/0001-esquema-talles.md) (talles), [0002](../decisions/0002-prisma-en-workers.md) (Prisma en Workers).

## Stack (idéntico a glamify-makeup salvo lo anotado)

Next.js 15 (App Router) + React 19 + TypeScript strict · shadcn/ui + Tailwind CSS v3.4 · Vitest + Playwright · Deploy Cloudflare Workers vía `@opennextjs/cloudflare` (`nodejs_compat`, NO Vercel) · PostgreSQL vía Supabase (Auth + Storage) · Prisma ORM + `@prisma/adapter-pg` (ver ADR 0002) · MercadoPago Checkout Pro · Resend · PostHog · Cron Triggers en `worker.ts`.

Desviación de versión (no de patrón): `pnpm@11.1.2` local (glamify pinea `8.15.0`) — CI fija su propia versión, no hay drift entre entornos.

## Invariantes de dominio (heredados sin cambio)

Montos ARS `Decimal(12,2)` (nunca float/centavos) · timestamps UTC, conversión a ART solo en display · UUIDs como PK (salvo `Setting.id="default"` y `RetractionRequest.seq` autoincrement) · enums en inglés británico (`cancelled`, doble L) · snapshots transaccionales en `OrderItem` · stock solo en `ProductVariant.stock` · SKU autogenerado `{PREFIJO_CATEGORIA}-{NNNN}`.

## Los tres deltas respecto de glamify

1. **Fiscal:** sin facturación en v1 (ver [01-negocio.md](01-negocio.md)).
2. **Envío:** sin API — se elimina el módulo `src/lib/shipping/*` de adapter/JWT/REST de MiCorreo. `ShippingZone` es la única fuente de costo (no fallback), vía `src/lib/shipping/quote.ts` — módulo NUEVO (no existe en glamify): cotiza por provincia o rango de CP contra las zonas activas y tira error explícito si ninguna matchea (mejor eso que cobrar de más/de menos por defecto). `ShipmentStatus` avanza a mano desde el admin.
3. **Catálogo:** variante = talle + color (ver [ADR 0001](../decisions/0001-esquema-talles.md)), no tono.

## Mapa de módulos — qué se copió de glamify (Fase 4, cerrada 2026-09-03)

| Módulo | Path en glamify | Estado en Hazing |
|---|---|---|
| Cliente DB por-request | `src/lib/prisma.ts` | Copiado exacto |
| MercadoPago Checkout Pro + webhook | `src/lib/payments/*` | Copiado, `statement_descriptor`/branding → HAZING |
| Checkout + webhook de pedido | `src/lib/orders/checkout-service.ts`, `webhook-service.ts` | Adaptado: sin combos, sin `weightGr`, sin auto-import a MiCorreo (delta #2) — el Shipment queda `pending` para carga manual |
| Máquina de estados + expiry | `src/lib/orders/state-machine.ts`, `expiry.ts`, `expiry-job.ts`, `stock.ts`, `order-number.ts` | Copiado/adaptado (prefijo `HZG-`, sin rama de combo en `stock.ts`) |
| Auth y guards | `src/lib/admin/auth.ts` (`requireAdmin`) + `src/lib/supabase/*` | Copiado exacto |
| Carrito | `src/lib/cart/*` | Adaptado: `CartLine` sin `kind: "combo"` ni `weightGr` |
| Cupones | `src/lib/coupons/apply.ts` | Adaptado: sin rama de combo en `matchesScope` |
| Catálogo (pricing/types) | `src/lib/catalog/pricing.ts`, `types.ts` | Copiado exacto (dependencia transitiva de cart/checkout) |
| Email transaccional | `src/lib/email/resend.ts`, `templates.ts` | Estructura copiada, templates reescritos con branding Hazing (sin rosa, sin emoji) |
| Guard de escritura en DB | `scripts/prod-write-guard.ts` | Copiado exacto |
| Cron triggers | `worker.ts`, `src/lib/cron/deps.ts` | Copiado/wireado (abandoned cart + order expiry, horario) |
| Cotización de envío | — (no existe en glamify) | **Nuevo**: `src/lib/shipping/quote.ts`, ver delta #2 arriba |

Pendiente para fases siguientes (no es que falte copiar, es que no es Fase 4): `src/lib/legal/retraction/*` (Botón de Arrepentimiento), `src/lib/reviews/*`, `src/lib/customer/*`, el Route Handler `/api/webhooks/mercadopago` y toda la UI (Fases 6-9).

Módulos que NO se copian nunca: `src/lib/shipping/micorreo.ts`, `zipnova.ts`, `index.ts`, `tracking.ts`, `correo.ts` (adapter/JWT/REST — delta #2) · `src/lib/orders/auto-shipment.ts` (100% MiCorreo, sin equivalente en envío manual).

## Variables de entorno

Ver `.env.example` (Fase 1). Sin `MICORREO_*` ni `ZIPNOVA_*` (no existen en Hazing).

## Definition of Done por cambio

`pnpm format:check` + `pnpm lint` + `pnpm typecheck` + `pnpm test` en verde (ver [`04-calidad.md`](04-calidad.md) y `scripts/audit-verify.sh`).
