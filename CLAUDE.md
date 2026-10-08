# CLAUDE.md

Guía para Claude Code en este repositorio.

# Hazing

Ecommerce B2C de ropa femenina para Argentina (Luján / envíos a todo el país). Stack serverless Next.js 15 en Vercel + Supabase Postgres vía Prisma adapter ([ADR 0005](docs/decisions/0005-deploy-en-vercel.md)). Blanco y negro, "hiper mega premium" — ver §8 del handoff, resumido abajo.

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

- `pnpm dev` — localhost:3000 · `pnpm build` + `pnpm start` — build de producción local (es el mismo build que corre Vercel; sirve para medir bundle y Lighthouse)
- `pnpm test:watch` · `pnpm test:e2e` — Playwright E2E (`@axe-core/playwright` para a11y)
- `pnpm db:migrate` — `prisma migrate dev` contra Supabase (lee `.env.local`; migración inicial aplicada el 2026-09-28, RLS sin políticas en todas las tablas: toda migración nueva que cree una tabla tiene que agregar su `ENABLE ROW LEVEL SECURITY`) · `pnpm db:push` · `pnpm db:studio` · `pnpm db:seed` / `db:seed:clean` — productos `demo-*` (pasan por el guard; ver `docs/spec/06-storefront.md` §4). Base local sin Docker: `prisma dev --name hazing`, no soporta conexiones concurrentes → `DATABASE_POOL_MAX=1` (ya en `.claude/launch.json`)
- **CI:** GitHub Actions corre `quality` en cada push/PR a `main` (incluye el gate de three.js/lenis fuera de `.next/server`). `deploy` se agrega en Fase 10: Vercel CLI + token, atrás del gate, calcado de glamify.
- **Guard de escritura en DB:** `scripts/prod-write-guard.ts` (copiado de glamify) — scripts mutadores exigen tipear el host por terminal interactiva.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict · shadcn/ui + Tailwind CSS v3.4 · Vitest + Playwright
- **Deploy:** Vercel, cuenta Pro de Lazar, proyecto separado de glamify ([ADR 0005](docs/decisions/0005-deploy-en-vercel.md), 2026-09-24 — reemplaza a Cloudflare Workers). Base: proyecto Supabase propio de Hazing en la organización de Lazar. Nada compartido con glamify a nivel proyecto.
- **PostgreSQL vía Supabase** (Auth + Storage) · **Prisma ORM** con driver adapter (`@prisma/adapter-pg`), igual que glamify — ver [ADR 0002](docs/decisions/0002-prisma-en-workers.md) y ADR 0005.
- **Cliente DB:** `src/lib/prisma.ts` es un singleton **perezoso** en `globalThis` detrás de un `Proxy` (calcado de glamify). Nunca construirlo al importar el módulo: `next build` importa los Route Handlers sin ejecutarlos y rompería sin `DATABASE_URL`.
- **MercadoPago Checkout Pro:** `src/lib/payments/*` + `src/lib/orders/checkout-service.ts`/`webhook-service.ts` listos como librería (pagos instantáneos, efectivo/offline excluido, webhook con firma HMAC + idempotencia por `mpPaymentId`). El Route Handler `/api/webhooks/mercadopago` y la UI de checkout se cablean en Fase 8.
- **Envíos:** sin API (delta vs. glamify) — `src/lib/shipping/quote.ts` (módulo nuevo, no existe en glamify) cotiza SOLO contra `ShippingZone` activa por provincia/rango de CP; sin match, tira error explícito (no hay fallback). `ShipmentStatus` avanza a mano desde el admin ("marcar despachado" + tracking freeform, Fase 9).
- **Resend:** email transaccional (`src/lib/email/*`, templates con branding Hazing sin rosa/emoji) · **PostHog:** analítica (pendiente, Fase 6+) · **Cron:** Vercel Cron horario (`vercel.json`) → `src/app/api/cron/route.ts`, protegido con `Authorization: Bearer $CRON_SECRET` (abandoned cart + order expiry).

## Arquitectura del código

Patrón: **Next.js App Router + servicios desacoplados en `src/lib/*`**. La lógica transaccional NO vive en UI ni routing.

- `src/app/(storefront)/*` — Storefront: home, `/tienda`, `/producto/[slug]`, `/carrito`, `/checkout`, `/cuenta`, `/ingresar`, `/arrepentimiento`, páginas legales/institucionales.
- `src/app/admin/*` — Panel admin: `/admin/login`, `/admin/(panel)` (`/pedidos`, `/productos`, `/categorias`, `/cupones`, `/resenas`).
- `src/app/api/*` — Route Handlers exclusivamente para webhooks (`/api/webhooks/mercadopago`), el cron (`/api/cron`), callbacks de auth, sitemap/robots.
- `src/lib/*` — Dominios: `orders/`, `payments/`, `cart/`, `catalog/`, `admin/`, `coupons/`, `email/`, `supabase/`, `prisma.ts`. `shipping/quote.ts` es el único archivo de `shipping/` — cotiza por `ShippingZone`, sin adapter de courier (delta vs. glamify, que tiene un módulo `shipping/` entero de MiCorreo/Zipnova que Hazing no porta). `customer/` y `reviews/` todavía no existen — se agregan cuando haga falta esa funcionalidad (Fase 6/7).
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

`Product.sizeSystem` (`letters | numeric | one_size`) elegido por producto, no por categoría. `ProductVariant.size` + `ProductVariant.color`, validados en `src/lib/admin/products/validation.ts` contra `SIZE_SCALES` de `src/lib/catalog/sizes.ts` (`sizes.ts` existe desde la Fase 6; `validation.ts` entra en Fase 7). Par `(size, color)` único por producto. Escalas nuevas = cambio de código, no de admin.

## Vetos de producto (no reproponer)

- Efectivo/offline (Rapipago/Pago Fácil): excluido.
- Reembolsos automáticos por API: descartados — manual + registro admin.
- Emojis como íconos: prohibidos (Lucide SVG).
- Stock falso / urgencia falsa: prohibido.
- Deploy fuera de Vercel: descartado salvo ADR nuevo (Cloudflare Workers se abandonó en ADR 0005, igual que en glamify).
- **API de envío (MiCorreo/PaqAr/Zipnova/Mercado Envíos) en v1: descartada.** Despacho 100% manual.
- **Facturación automática en v1: descartada.**
- Dark mode: a decidir como parte de la identidad de marca (no es invariante universal).

## Dirección de arte — digital flagship (ver `docs/spec/05-direccion-arte.md`)

Es el requisito de producto más importante del proyecto. **Fuente de verdad vigente: `docs/spec/05-direccion-arte.md`** (redefine el objetivo de Fase 5 el 2026-09-03: de "design system básico" a experiencia coreografiada tipo digital flagship — no improvisar a ojo). El §8 del handoff (`00-handoff.md`) sigue valiendo donde ese documento no lo contradice. ADR de stack de motion/3D: `docs/decisions/0003-motion-y-3d.md`.

Reglas verificables, ya implementadas en `tailwind.config.ts`/`src/app/globals.css`/`src/lib/motion/*` (sub-fase 5.1, commits `97443c8` + `865a5f4`):

- **Texto:** `#171717` (`ink`), NUNCA `#000` puro — ni siquiera en el wordmark: usar `<Wordmark />` (`src/components/brand/wordmark.tsx`, SVG inline), nunca `<img src=".../hazing-wordmark.svg">` (un `<img>` no hereda `currentColor`, renderiza negro puro).
- **Imágenes de producto:** `border-radius: 0`. `rounded-control` (2px) en botones/inputs. `rounded-full` solo en swatches/avatares/dots.
- **Aspect ratio:** uno solo por contexto (`3/4` PDP/lookbook, `4/5` grilla de catálogo/NEW IN). Nunca mezclar en la misma grilla.
- **Movimiento:** tokens en `src/lib/motion/tokens.ts` (mismos valores que los `--dur-`/`--ease-` de `globals.css`) — micro/UI 150-250ms `ease-ui`, overlays 450ms, imagen 700ms, cinema 1200ms. GSAP + ScrollTrigger/Flip para todo lo secuenciado; Lenis solo desktop con puntero fino; three/R3F/drei solo en `src/components/immersive/*`, lazy, nunca en el bundle inicial. `prefers-reduced-motion` de primera clase (`useReducedMotion()` + `gsap.matchMedia`).
- **Foco visible siempre:** `outline` (nunca `ring`/`shadow`, que son box-shadow) en todo elemento interactivo — un hallazgo real de accesibilidad (WCAG 2.4.7) se coló en la primera versión del menú fullscreen; cualquier componente nuevo con `outline-none` tiene que llevar su `focus-visible:outline` en el mismo `className`.
- **Tipografía:** `Inter` (UI/body/nav) + `Archivo` variable con eje `wdth` (display/wordmark) — `weight: "variable"` en `next/font/google`, no pesos fijos (`weight` fijo + `axes` no compila). Tracking por tamaño: ≤16px 0.12em, 17-40px 0.06em, >40px 0.02em en MAYÚSCULAS.
- **Estados sin rojo ni verde:** forma + texto comunican éxito/error/stock (`StockLine`, `SizeSelector`), nunca un badge de color. "Agotado" siempre visible en el flujo del documento, nunca solo en `:hover` (no existe en mobile).
- **Anti-patrones prohibidos:** carruseles con flechas grandes, badges rojos de oferta, countdowns de urgencia, `box-shadow`/`ring-*`, más de un color no-neutral en la misma vista, mezclar ratios, easing bounce/elastic, popups de descuento al entrar, cursores custom, tilt, glassmorphism, gradientes, marquees.

Assets pendientes de producción (fashion film, fotografía de campaña y de producto) están catalogados en `docs/spec/05-direccion-arte.md` §12 — no se inventan sustitutos con CSS, se construye contra un slot con el código del asset hasta que exista.

## Seguridad y Permisos

- **Admin:** `requireAdmin()` (`src/lib/admin/auth.ts`) chequea sesión Supabase Auth + rol `owner`/`admin` en tabla `User`.
- **MP Webhook:** `src/lib/orders/webhook-service.ts` valida firma HMAC en `x-signature`, re-consulta a la API de MP, procesa idempotentemente por `mpPaymentId`. El Route Handler que lo expone se cablea en Fase 8.
- **Secretos:** solo en las Environment Variables del proyecto de Vercel y en `.env.local`. NUNCA en git ni en cliente.
- **Guard de mutación:** `scripts/prod-write-guard.ts` intercepta scripts locales para confirmar host de Supabase por terminal.

## Skill routing

| Situación                              | Gana                                                  |
| -------------------------------------- | ----------------------------------------------------- |
| Tarea no trivial — SIEMPRE primero     | `protocolo-orquestacion`                              |
| Feature nuevo                          | `entrega-feature`                                     |
| Bug / comportamiento raro              | agente `sonnet-debugger`                              |
| Fixes de una lista de hallazgos        | `protocolo-fixes-general`                             |
| Decisión de arquitectura no obvia      | `decision-arquitectura`                               |
| Revisar PR / diff                      | `/code-review` + agente `sonnet-adversarial-reviewer` |
| Verificar implementación propia        | agente `sonnet-adversarial-reviewer`                  |
| Verificar flujo de UI corriendo la app | `verificacion-ux`                                     |
| Cierre de esfuerzo / release           | agente `sonnet-release-verifier`                      |

## Comunicación

Respuestas directas, sin intro ni conclusiones. Código y comandos exactos. Si hay ambigüedad o falta info, señalar/preguntar antes de inventar — usar formato "REQUIERE INPUT" para decisiones de negocio no contempladas en `docs/spec/`.

## Guardrails

**SIEMPRE**

- Correr `format:check`, `lint`, `typecheck`, `test` antes de decir "listo". Al declarar verde, citar el output real.
- TypeScript strict sin excepciones. Server Actions para mutaciones UI; Route Handlers solo para webhooks MP, el cron, auth callbacks y sitemap/robots. Queries a DB solo desde Server Components, Server Actions o esos Route Handlers, vía `prisma` de `src/lib/prisma.ts`.

**PREGUNTAR ANTES**

- Decisiones de negocio no contempladas en `docs/spec/` (reportar como "REQUIERE INPUT" con pregunta numerada). Eliminar código, tablas o alterar carpetas.

**NUNCA**

- `any` (usar `unknown` + type guards). Commitear o pushear a `main` directamente sin que Lazar lo pida. Modificar una migración ya aplicada. Inventar nombres de tablas/columnas/rutas. Hardcodear credenciales o URLs de prod. Agregar dark mode, emojis o contadores de urgencia falsos sin decisión explícita. Editar `scripts/audit-verify.sh` como parte de un fix. Reproponer API de envío o facturación automática en v1.

## Git

Cuenta de GitHub: **`Laza223`**, repo privado `hazing`, como glamify (ADR 0005). El remote todavía no está configurado: se agrega cuando Lazar cree el repo (ver `SETUP.md` §1).

## Compact Instructions

Al resumir: preservar cambios de schema Prisma/APIs, errores y soluciones exactas, archivos modificados, decisiones arquitectónicas (ADRs) y estado de la fase en curso (ver `docs/spec/00-handoff.md` §6, plan de 10 fases). Resumir brevemente intentos fallidos y debates concluidos.
