# Hazing

Ecommerce de ropa femenina — Next.js 15 + Supabase + Prisma + **Cloudflare Workers**.
Fuente de verdad del producto: [`docs/spec/`](docs/spec/). Decisiones de arquitectura: [`docs/decisions/`](docs/decisions/).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind 3 · shadcn/ui · Prisma 6 + `@prisma/adapter-pg` (ver [ADR 0002](docs/decisions/0002-prisma-en-workers.md)) · Supabase (Postgres/Auth/Storage) · Cloudflare Workers vía `@opennextjs/cloudflare` · Vitest · Playwright.

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # completar con credenciales — ver SETUP.md
pnpm dev                     # http://localhost:3000
```

## Scripts

- `pnpm dev` — desarrollo
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm test:e2e`
- `pnpm format:check` — verificar formato (usar antes de `format`, que reescribe)
- `./scripts/audit-verify.sh` — juez de verificación (los 4 anteriores en orden)
- `pnpm build:worker` / `pnpm deploy` — build y deploy a Cloudflare Workers

## Convenciones

- Dinero: `Decimal(12,2)` ARS. Estados en inglés británico (`cancelled`).
- Timestamps UTC; conversión a ART en el front.
- Secrets solo en `.env.local` / `wrangler secret` (nunca en git).
- Ver [`CLAUDE.md`](CLAUDE.md) para el detalle completo de convenciones e invariantes.
