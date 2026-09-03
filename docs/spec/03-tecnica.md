# 03 — Técnica

Fuente: [`00-handoff.md`](00-handoff.md) §1, §4, §6. ADRs: [0001](../decisions/0001-esquema-talles.md) (talles), [0002](../decisions/0002-prisma-en-workers.md) (Prisma en Workers).

## Stack (idéntico a glamify-makeup salvo lo anotado)

Next.js 15 (App Router) + React 19 + TypeScript strict · shadcn/ui + Tailwind CSS v3.4 · Vitest + Playwright · Deploy Cloudflare Workers vía `@opennextjs/cloudflare` (`nodejs_compat`, NO Vercel) · PostgreSQL vía Supabase (Auth + Storage) · Prisma ORM + `@prisma/adapter-pg` (ver ADR 0002) · MercadoPago Checkout Pro · Resend · PostHog · Cron Triggers en `worker.ts`.

Desviación de versión (no de patrón): `pnpm@11.1.2` local (glamify pinea `8.15.0`) — CI fija su propia versión, no hay drift entre entornos.

## Invariantes de dominio (heredados sin cambio)

Montos ARS `Decimal(12,2)` (nunca float/centavos) · timestamps UTC, conversión a ART solo en display · UUIDs como PK (salvo `Setting.id="default"` y `RetractionRequest.seq` autoincrement) · enums en inglés británico (`cancelled`, doble L) · snapshots transaccionales en `OrderItem` · stock solo en `ProductVariant.stock` · SKU autogenerado `{PREFIJO_CATEGORIA}-{NNNN}`.

## Los tres deltas respecto de glamify

1. **Fiscal:** sin facturación en v1 (ver [01-negocio.md](01-negocio.md)).
2. **Envío:** sin API — se elimina el módulo `src/lib/shipping/*` de adapter/JWT/REST de MiCorreo. `ShippingZone` es la única fuente de costo (no fallback). `ShipmentStatus` avanza a mano desde el admin.
3. **Catálogo:** variante = talle + color (ver [ADR 0001](../decisions/0001-esquema-talles.md)), no tono.

## Mapa de módulos — qué se copia tal cual de glamify (Fase 4)

| Módulo | Path en glamify | Nota |
|---|---|---|
| Cliente DB por-request | `src/lib/prisma.ts` | Copiar exacto |
| MercadoPago Checkout Pro + webhook | `src/lib/payments/*` | Copiar exacto, credenciales propias |
| Máquina de estados de pedido | `src/lib/orders/*` | Copiar exacto |
| Auth y guards | `src/lib/admin/auth.ts` (`requireAdmin`) | Copiar patrón exacto |
| Carrito | `src/lib/cart/*` | Copiar exacto |
| Cupones | `src/lib/coupons/*` | Copiar exacto |
| Reseñas + moderación | `src/lib/reviews/*` | Copiar exacto |
| Email transaccional | `src/lib/email/*` | Copiar estructura, reescribir templates |
| Botón de Arrepentimiento | `src/lib/legal/retraction/*` | Copiar exacto |
| Guard de escritura en DB | `scripts/prod-write-guard.ts` | Copiar exacto |
| Cron triggers | `worker.ts` | Copiar patrón (Fase 4) |

Módulos que NO se copian: `src/lib/shipping/*` (MiCorreo/Zipnova adapter — delta #2).

## Variables de entorno

Ver `.env.example` (Fase 1). Sin `MICORREO_*` ni `ZIPNOVA_*` (no existen en Hazing).

## Definition of Done por cambio

`pnpm format:check` + `pnpm lint` + `pnpm typecheck` + `pnpm test` en verde (ver [`04-calidad.md`](04-calidad.md) y `scripts/audit-verify.sh`).
