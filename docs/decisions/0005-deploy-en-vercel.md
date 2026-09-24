# ADR 0005 — Deploy en Vercel y base en el Supabase de Lazar

**Estado:** Decidida (Lazar, 2026-09-24; repo de GitHub en la cuenta `Laza223`, como glamify) · **Revierte:** el veto "Deploy fuera de Cloudflare Workers" (handoff §5, `CLAUDE.md`) y la decisión §3.1 del handoff "cuentas nuevas a nombre de la dueña" en lo que toca a hosting y base de datos · **Enmienda:** ADR 0002 (el motivo del cliente por-request desaparece) y ADR 0003 (el gate de bundle pasa de `.open-next/worker.js` a `.next/server`).

## Problema

Hazing se armó para Cloudflare Workers porque glamify-makeup corría ahí y la regla del proyecto es calcar glamify. Glamify migró a Vercel el 2026-09-12 (commit `b25d196`, PR #6) y hoy corre en la cuenta Vercel Pro de Lazar. El 2026-09-24 Lazar dijo, al preguntarle por las cuentas de la dueña: *"Para front voy a usar mi vercel como glamify y seguro le creo una micro más en mi supabase."*

Además, Workers tiene un costo propio que ya pagamos en este repo: `pnpm build:worker` no corre en Windows (EPERM de symlink, ADR 0003), así que el bundle real solo se puede medir en CI.

## Alternativas descartadas

1. **Seguir en Cloudflare Workers con cuenta de la dueña.** Es lo decidido el 2026-09-03. Descartada: sería el único proyecto propio en Workers después de que glamify salió de ahí, y la cuenta de la dueña hoy no existe (20 días sin crearse).
2. **Vercel en una cuenta Hobby nueva de la dueña.** Hobby es solo para uso personal no comercial (un ecommerce no califica) y limita Vercel Cron a una corrida por día, cuando los jobs corren cada hora. Glamify evaluó y descartó lo mismo.

## Decisión

**Hosting en la cuenta Vercel Pro de Lazar, como proyecto separado de glamify. Base de datos en un proyecto Supabase nuevo dentro de la organización de Lazar (Micro compute).** Cero recursos compartidos con glamify a nivel proyecto: base, storage, auth, variables de entorno y credenciales propias de Hazing. Lo que se comparte es la facturación y el acceso de Lazar.

Cambio de código, calcado de glamify `b25d196`:

- `src/lib/prisma.ts`: cliente por-request (`cache()` + Proxy, necesario en Workers) → singleton perezoso cacheado en `globalThis`. Perezoso a propósito: `next build` importa los Route Handlers sin ejecutarlos y un cliente eager rompe el build sin `DATABASE_URL` (le pasó a glamify en su primer deploy).
- Cron horario (carrito abandonado + vencimiento de pedidos): el `scheduled()` de `worker.ts` pasa a `src/app/api/cron/route.ts`, protegido con `Authorization: Bearer $CRON_SECRET`, disparado por Vercel Cron nativo (`vercel.json`, `0 * * * *`).
- Se eliminan `worker.ts`, `wrangler.jsonc`, `open-next.config.ts`, `src/lib/cron/deps.ts`, las dependencias `@opennextjs/cloudflare` y `wrangler`, y los scripts `build:worker` / `dev:worker` / `preview:worker` / `deploy`.
- CI: el job `quality` saca el build de OpenNext. El gate de ADR 0003 (three.js y lenis fuera del servidor) se mantiene, pero sobre `.next/server` después de `pnpm build`. Al migrarlo apareció que el marcador de lenis (`class Lenis`) no sobrevive al minificado — no aparecía ni en el chunk del cliente, así que ese gate nunca podía fallar. Se cambió a `lenis-smooth` (clase CSS que Lenis agrega al `<html>`), medido: 1 archivo en `.next/static`, 0 en `.next/server`. `WebGLRenderer`: 4 en `.next/static`, 0 en `.next/server`. El job `deploy` (Fase 10) usa Vercel CLI + token, igual que glamify, para que el deploy quede atrás del gate de CI.
- Secretos: en las Environment Variables del proyecto de Vercel y en `.env.local`. Nuevo: `CRON_SECRET`.

Prisma se queda, con `@prisma/adapter-pg` como en glamify (ADR 0002): el schema, los servicios y la infraestructura portada ya están sobre Prisma. El motivo original de ADR 0002 (Workers no corre los drivers de Drizzle) ya no aplica, pero cambiar de ORM ahora no aporta nada y rompe el calco con glamify.

## Consecuencias

- Desaparece el bloqueo de `build:worker` en Windows: `pnpm build` local es el build real, y las mediciones de bundle y Lighthouse se pueden hacer en esta máquina.
- Costo: el proyecto Vercel entra en el plan Pro que ya paga Lazar. El proyecto Supabase suma una instancia Micro a la organización de Lazar (hoy USD 10/mes aprox., lo confirma Lazar en su panel).
- La tienda depende de cuentas personales de Lazar. Si en algún momento la dueña quiere ser titular, se transfiere el proyecto de Vercel y el de Supabase (ambos lo permiten entre cuentas/organizaciones).
- `SETUP.md`, `README.md`, `CLAUDE.md` y las secciones de Cloudflare de la spec se actualizaron en el mismo cambio. El ADR 0004 (cotización MiCorreo, de otra sesión) menciona "Cloudflare Secrets": pasan a ser Environment Variables de Vercel.

## Reversibilidad

Barata hoy: nada deployado, sin datos. Volver a Workers sería revertir el commit de migración.
