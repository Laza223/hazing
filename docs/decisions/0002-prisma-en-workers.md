# ADR 0002 — Prisma (no Drizzle) en Cloudflare Workers

**Estado:** Heredada de `glamify-makeup`, sin cambios · **Bucket:** C-STACK (excepción documentada)

## Problema

El stack default del OS (`stack-defaults-ts-next-pg-drizzle.md`) especifica Drizzle ORM sobre Postgres. Cloudflare Workers (el runtime elegido, ver §2.4/§5 del handoff — deploy fuera de Workers descartado salvo ADR nuevo) no puede correr el driver `postgres-js` de Drizzle ni el cliente Node-only de Supabase: el runtime de Workers no expone sockets TCP persistentes de la forma que esos clientes asumen.

## Alternativas descartadas

1. **Drizzle + `postgres-js`.** Es el default del OS. Descartada: incompatible con el runtime de Workers (confirmado en producción por glamify-makeup, que migró de este problema).
2. **Cambiar de runtime a Vercel/Node tradicional para poder usar Drizzle sin adapter.** Descartada explícitamente por el handoff (§5, "Deploy fuera de Cloudflare Workers: descartado salvo ADR nuevo") — Cloudflare Workers es la decisión de infraestructura ya tomada, no se reabre acá.

## Decisión

Prisma ORM con `@prisma/adapter-pg` (driver adapter) + `@prisma/client/wasm`, exactamente como en glamify-makeup. Cliente por-request vía `cache()` de React + `Proxy` perezoso (`src/lib/prisma.ts`, copiado tal cual en Fase 4) — en Workers un socket TCP no se comparte entre requests, así que el cliente se crea por request y soporta tanto `env.HYPERDRIVE` (binding) como `process.env.DATABASE_URL`.

Es la excepción que el propio stack default anticipa: *"Known exception: an edge runtime (e.g. Cloudflare Workers) can't run Drizzle's `postgres-js` driver or Node-only Supabase client code. Use Prisma with `@prisma/adapter-pg` instead, and document the deviation explicitly in that project's CLAUDE.md — don't silently mix ORMs across services."*

## Reversibilidad

Cara de revertir: cambiar de ORM después de tener schema + datos + queries en producción implica reescribir toda la capa `src/lib/*` y migrar datos. No se prevé revertir — es el mismo patrón que ya corre en producción con plata real en glamify-makeup.

## Consecuencias aceptadas

- Migraciones como SQL versionado vía `prisma migrate dev`, no el patrón de SQL numerado a mano de Drizzle que sugiere el stack default — se sigue la convención de Prisma (`prisma/migrations/`), consistente con glamify.
- `next.config.mjs` necesita `serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-pg", "pg"]` para que el bundler de Next no intente empaquetar el cliente nativo (se agrega en Fase 3, junto al schema).
