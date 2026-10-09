# Handoff — Ecommerce "Hazing" (ropa)

Repo nuevo desde cero. Arquitectura calcada de `glamify-makeup`, con 3 deltas: sin monotributo/razón social propia, despacho manual con cotización de envío en vivo como glamify (ADR 0004), catálogo de ropa en vez de maquillaje. Este doc es la fuente de verdad para la sesión que arranque el repo — leerlo completo antes de tocar código.

---

## 1. Qué se replica TAL CUAL de glamify-makeup

Código y patrones portables sin cambios de lógica (solo naming/branding):

| Módulo | Path de referencia en glamify-makeup | Nota |
|---|---|---|
| Cliente DB | `src/lib/prisma.ts` | Copiar exacto — singleton perezoso en `globalThis` detrás de un Proxy (versión post-Vercel de glamify, ADR 0005; la versión por-request de Workers quedó obsoleta) |
| MercadoPago Checkout Pro + webhook | `src/lib/payments/*` | Adapter MP, validación HMAC `x-signature`, idempotencia por `mpPaymentId` — copiar exacto |
| Máquina de estados de pedido | `src/lib/orders/*` | `OrderStatus`/`PaymentStatus`/`ShipmentStatus`, expiry job — copiar exacto |
| Auth y guards | `src/lib/admin/*` (`requireAdmin`) + Customer via Supabase Auth | Copiar patrón exacto |
| Carrito (servicio, cookies, merge, job abandono) | `src/lib/cart/*` | Copiar exacto |
| Cupones | `src/lib/coupons/*` (`perCustomerLimit`) | Copiar exacto |
| Reseñas + moderación | `src/lib/reviews/*` | Copiar exacto |
| Email transaccional (Resend) | `src/lib/email/*` | Copiar estructura, reescribir templates con branding Hazing |
| Botón de Arrepentimiento (Res. 424/2020) | `/arrepentimiento` + `RetractionRequest` (seq autoincrement `ARR-NNNNNN`) | Obligatorio, no es específico de maquillaje — copiar exacto |
| Guard de escritura en DB (`prod-write-guard.ts`) | `scripts/prod-write-guard.ts` | Copiar exacto |
| Cron horario | `src/app/api/cron/route.ts` + `vercel.json` | Copiar patrón (abandoned cart, order expiry). Antes era `worker.ts` en Workers (ADR 0005) |

## 2. Qué cambia

### 2.1 Fiscal (no bloquea el build)
Persona física sin monotributo ni razón social. MercadoPago solo pide CUIT/CUIL vinculado a la cuenta receptora — cualquier persona con DNI tiene CUIL, no implica inscripción AFIP. No hay gate técnico para operar así. La obligación tributaria por actividad habitual existe igual y es decisión/timing del dueño, no del código.

**Implicancia en el sistema:** no se construye módulo de facturación en v1. `Order`/`OrderItem` ya quedan con snapshot de nombre/monto/fecha suficiente para facturar después, adentro o afuera del sistema, con cualquier CUIT que se decida más adelante.

### 2.2 Envío — cotización en vivo como glamify, despacho manual
> **Actualizado el 2026-09-24 por [ADR 0004](../decisions/0004-cotizacion-de-envio-en-vivo.md).** La versión original de esta sección (2026-09-03) decidía "sin API de envío, `ShippingZone` única fuente". Se revirtió solo la parte de la cotización; el despacho sigue manual.

El **cálculo de envío es el mismo que en glamify**: gratis por umbral → cotización en vivo con la API oficial de MiCorreo (CP, peso, método) → fallback a `ShippingZone`. El **despacho es manual** (Correo Argentino o Mercado Envíos, decisión de la dueña al momento de despachar, fuera del sistema).

**Implicancia en el sistema:**
- Se porta de glamify `src/lib/shipping/*` (`index.ts`, `micorreo.ts`, `quote.ts`, `tracking.ts`). No se portan `zipnova.ts`, `correo.ts` ni `orders/auto-shipment.ts` (auto-import).
- La tabla `ShippingZone` queda como **fallback** (igual que en glamify), configurada en el admin y calibrada a costo real de ropa.
- Se reincorpora `weightGr` (la cotización necesita el peso).
- `ShipmentStatus` se sigue usando (`pending → ready → dispatched → in_transit → delivered` | `returned`), pero las transiciones las dispara el admin a mano desde el panel (botón "marcar despachado" + campo de tracking freeform opcional), no un webhook de courier.

### 2.3 Catálogo — ropa, no maquillaje
`ProductVariant` de glamify usa "tono/shade". En Hazing la variante es **talle + color**. Definir en el schema Prisma:
- `ProductVariant.size` (enum o string: XS/S/M/L/XL/XXL, o numérico según categoría)
- `ProductVariant.color`
- Stock sigue viviendo en `ProductVariant.stock`, mismo patrón de descuento en `PaymentStatus.approved` con transacción Prisma.
- SKU autogenerado mismo patrón: `{PREFIJO_CATEGORIA}-{NNNN}`.
- Categorías jerárquicas (2 niveles) — contenido nuevo, ej: Remeras, Pantalones, Vestidos, Buzos / por debajo: subcategorías si aplica.

### 2.4 Diseño — marca nueva, y es EL diferenciador
El design system girly-glam rosa (`#FF2E93`, Playfair Display + Nunito Sans) es de glamify y **no se hereda en absoluto**.

Hazing es blanco y negro con grises, y el objetivo declarado es **"hiper mega premium"**. Esto no es una preferencia estética menor: es el requisito de producto más importante del proyecto. Un ecommerce de ropa monocromo mal ejecutado se ve barato inmediatamente, y no hay color de acento donde esconderse — toda la jerarquía visual la cargan tipografía, espacio en blanco, ratio de imagen y movimiento.

Ver §8 para el design brief con referencias concretas de los mejores ecommerce de ropa del mundo. **No improvisar el diseño**: seguir el brief.

## 3. Decisiones de negocio — estado

Contexto de negocio confirmado: **la dueña de Hazing es la cuñada de Lazar**, opera desde **Luján (CP 6700)** igual que glamify. Ella es la usuaria del panel admin.

### RESUELTAS

1. **Cuentas e infraestructura** — RESUELTA
   Todo nuevo y 100% separado de glamify: cuenta de GitHub nueva, proyecto Supabase nuevo, cuenta Cloudflare nueva. Cero recursos compartidos, cero credenciales compartidas.
   > **Actualizado el 2026-09-24 por [ADR 0005](../decisions/0005-deploy-en-vercel.md):** hosting en la cuenta Vercel Pro de Lazar, base en un proyecto Supabase nuevo dentro de la organización de Lazar y repo en el GitHub `Laza223` — como glamify. Sigue sin compartirse nada con glamify a nivel proyecto (base, storage, auth, variables y credenciales propias); lo compartido es la cuenta y la facturación de Lazar.

2. **Paleta de marca** — RESUELTA
   Blanco y negro, con grises como rango intermedio. Sin color de acento cromático.
   Objetivo declarado por el dueño: **"hiper mega premium"** — el diseño no es decorativo, es el diferenciador del producto. Ver §8 (design brief con referencias reales de los mejores ecommerce de ropa del mundo).

3. **Origen de despacho** — RESUELTA
   Luján, CP 6700 (mismo que glamify).

4. **Costo de envío (base)** — PARCIAL
   Mismo origen y misma zona geográfica que glamify, así que **la tabla `ShippingZone` de glamify sirve como punto de partida directo**. Pendiente de ajustar: la ropa pesa y ocupa más volumen que el maquillaje, así que los valores por zona probablemente necesiten corrección al alza. Confirmar con la dueña antes de publicar.

### PENDIENTES — bloquean distintas fases

5. **CUIT/CUIL a vincular en MercadoPago** — PENDIENTE
   Bloquea: conectar la cuenta de MP real (fase 8 del plan). No bloquea el desarrollo — se trabaja con credenciales de test de MP hasta tenerlo.
   Nota: siendo la cuñada la dueña, lo más probable es que sea el CUIL de ella.

6. **Dominio** — PENDIENTE
   Bloquea: deploy final y configuración de DNS. Lazar lo pasa ni bien lo compre. No bloquea desarrollo (se trabaja con el subdominio `.vercel.app`).

7. **Esquema de talles** — PENDIENTE (a definir en la sesión nueva)
   Bloquea: el schema de `ProductVariant` y por lo tanto todo el catálogo. **Es la primera decisión a cerrar en la sesión nueva.**
   Opciones: XS-XXL por letra, numérico (36-46), o mixto por categoría.

8. **Política de cambios/devoluciones** — PENDIENTE (a definir en la sesión nueva)
   Bloquea: páginas legales y flujo post-venta. En ropa el cambio por talle es el caso frecuente — decidir si hay política propia además del botón de arrepentimiento legal (que es obligatorio igual).

9. **Umbral de envío gratis** — PENDIENTE (a definir en la sesión nueva)
   Bloquea: nada estructural — es un valor en `Setting.freeShippingThreshold`, se carga cuando se sepa.

10. **Facturación** — PENDIENTE (a definir en la sesión nueva)
    Diferida por decisión explícita (§2.1). No se construye nada en v1.

## 4. Stack (idéntico a glamify-makeup)

- Next.js 15 (App Router) + React 19 + TypeScript strict · shadcn/ui + Tailwind CSS v3.4 · Vitest + Playwright
- Deploy: Vercel, como glamify desde el 2026-09-12 (ADR 0005 — el original decía Cloudflare Workers)
- PostgreSQL vía Supabase (Auth + Storage) · Prisma ORM con driver adapter (`@prisma/adapter-pg`)
- MercadoPago Checkout Pro (tarjeta + dinero en cuenta; `excluded_payment_types: ["ticket","atm"]`)
- Resend (email transaccional) · PostHog (analítica) · Vercel Cron horario → `/api/cron`
- Envío: cotización en vivo MiCorreo + fallback `ShippingZone`, despacho manual (ver §2.2 y ADR 0004)

Invariantes de dominio que se heredan sin cambios: montos ARS `Decimal(12,2)` (nunca float/centavos), timestamps UTC, UUIDs como PK, enums en inglés británico (`cancelled` doble L), snapshots transaccionales en `OrderItem`, stock solo en variantes, botón de Arrepentimiento obligatorio (Ley 24.240 / Res. 424/2020), Ley 25.326 datos personales.

## 5. Vetos heredados (no reproponer)

Mismos de glamify + los nuevos de este proyecto:
- Efectivo/offline (Rapipago/Pago Fácil): excluido, igual que glamify.
- Reembolsos automáticos por API: descartado, manual + registro admin.
- Retiro en persona: a definir en §3 si aplica distinto que glamify (glamify es 100% envío).
- Emojis como íconos: prohibido (Lucide SVG). Dark mode: a decidir como parte de la identidad de marca (glamify lo prohíbe por decisión propia, no es invariante universal).
- Stock falso / urgencia falsa: prohibido (ley de consumidor, igual en cualquier ecommerce AR).
- Deploy fuera de Vercel: descartado salvo ADR nuevo (era "fuera de Cloudflare Workers"; cambió con ADR 0005).
- **Nuevo — auto-import/despacho por API de courier y Zipnova en v1: descartados**, ver §2.2. La cotización en vivo con MiCorreo SÍ va (ADR 0004, revierte el descarte original).
- **Nuevo — Facturación automática en v1: descartada**, ver §2.1 y §2.4.

## 6. Plan de ejecución paso a paso

Camino A (greenfield) de la skill `arranque-proyecto`. Fases en orden — cada una cierra antes de abrir la siguiente.

**Fase 0 — Decisiones que bloquean el schema**
Cerrar con Lazar el esquema de talles (§3.7). Es lo único que bloquea el modelo de datos. El resto de los pendientes no frena el arranque.

**Fase 1 — Repo y configuración**
Repo nuevo en la cuenta de GitHub nueva. `docs/spec/` numerado (negocio → funcional → técnica → calidad) con lo de este doc como base. CLAUDE.md adaptado del de glamify: mismo formato, reemplazando dominio (maquillaje→ropa), design system (§2.4 + §8), envío (§2.2) y sección fiscal (§2.1). Settings de permisos `.claude/settings.json`.

**Fase 2 — Juez de verificación ANTES del primer feature**
`pnpm format:check` + `lint` + `typecheck` + `test`, scripts calcados de glamify, corriendo en verde sobre el esqueleto vacío. Sin esto, todo lo que sigue es inverificable.

**Fase 3 — Schema Prisma**
Partir del schema de glamify. Adaptar `ProductVariant` (talle + color en vez de tono). Eliminar toda configuración de API de envío (MiCorreo/JWT) *(revisado por ADR 0004: se reincorpora `weightGr` y la config de cotización MiCorreo; solo se elimina lo del auto-import)*. Mantener igual: `Order`, `OrderItem`, `Customer`, `User`, `Coupon`, `Review`, `RetractionRequest`, `Setting`, `ShippingZone`. Migración inicial + seed.

**Fase 4 — Infraestructura probada (copiar, no reinventar)**
`prisma.ts`, `payments/*`, `orders/*`, `cart/*`, `admin/requireAdmin`, `coupons/*`, `prod-write-guard.ts`. Es código ya probado en producción con plata real — copiarlo tal cual y verificar que corre, no reescribirlo.

**Fase 5 — Design system**
Implementar §8 (design brief) como tokens de Tailwind + componentes base shadcn/ui. **Esta fase es la que define si el proyecto cumple el objetivo "premium".** No pasar a storefront hasta tener los primitivos (tipografía, escala de grises, spacing, timings) definidos y aplicados a un par de componentes de muestra.

**Fase 6 — Storefront**
Patrón de glamify (`(storefront)`), con el catálogo de §2.3 y el diseño de la fase 5. La grilla de productos y la PDP son las dos pantallas donde se gana o se pierde la percepción premium.

**Fase 7 — Admin**
`admin/(panel)` calcado de glamify. La usuaria es la cuñada, no una persona técnica — vale la regla del dueño: "tan simple que un niño lo entienda".

**Fase 8 — Checkout + MP**
Copiar exacto de glamify, solo cambiar credenciales (`MP_*` propios). Desarrollar con credenciales de test hasta tener el CUIT/CUIL definitivo (§3.5).

**Fase 9 — Envío**
Cotización en vivo con MiCorreo como en glamify (ADR 0004; se consume en el checkout, Fase 8), con `ShippingZone` como fallback: tabla de glamify como base (mismo origen, CP 6700), ajustando valores al alza por peso/volumen de ropa. Sin auto-import. Botón de "marcar despachado" + campo de tracking freeform en el panel.

**Fase 10 — Deploy**
GitHub Actions `quality` + `deploy` a Vercel con Vercel CLI + token, calcado de glamify (ADR 0005). Secrets propios en las Environment Variables del proyecto de Vercel. Dominio cuando esté comprado (§3.6); hasta entonces, `.vercel.app`.

## 7. Qué NO hacer en v1 (fuera de scope explícito)

- Auto-import/despacho por API de courier (MiCorreo, PaqAr, Correo Argentino, Mercado Envíos API) — despacho 100% manual. La cotización en vivo con MiCorreo SÍ está en v1 (ADR 0004).
- Facturación automática o integrada — diferida, ver §2.1.
- Compartir CUALQUIER recurso con glamify-makeup: ni base Supabase, ni proyecto de hosting, ni storage, ni credenciales. Todo separado a nivel proyecto (§3.1; la cuenta de Vercel/Supabase/GitHub de Lazar sí es la misma, ADR 0005).
- Heredar el design system rosa de glamify. Blanco/negro/grises, según §8.
- Improvisar el diseño "a ojo" en vez de seguir el brief de §8.

---

## 8. Design brief — premium monocromo

Basado en inspección directa del CSS computado (tipografía, transiciones, grillas, radios, colores) de 8 ecommerce de ropa de referencia. Los valores de abajo son medidos, no inventados.

> Nota de método: SSENSE, COS, Net-a-Porter y Mr Porter bloquearon el acceso automatizado (Cloudflare / geo-bot), así que sus patrones citados vienen de crítica de terceros, no de CSS medido. The Row, Totême, Bottega Veneta, Acne Studios, Represent, Jacquemus, Everlane y Kith sí fueron medidos en vivo.

### 8.1 Referencias y qué robarle a cada una

1. **The Row** — manual de quiet luxury monocromo. Robar: texto casi-negro `#1c1b1b` (nunca `#000`), nav en minúsculas 13px/400 sin tracking agresivo, zoom de imagen a 700-800ms con cubic-bezier propio mientras los micro-hovers van a 150-250ms.
2. **Totême** — escandinavo. Robar: un único peso liviano (300) consistente en vez de bold por todos lados; grid de 12 columnas base con 2-3 visibles en shop.
3. **Bottega Veneta** — lujo editorial. Robar: la separación de velocidades — filtros/transforms de imagen 600-1200ms (cinematográfico) para hero/lookbook, UI funcional a 100-300ms. Nav discretísima a 10px.
4. **Acne Studios** — brutalismo escandinavo. Robar: CSS subgrid, nav en mayúsculas 12px con tracking mínimo (0.3px), radios de 2-5px reservados solo a controles, jamás a imágenes.
5. **Represent** — streetwear premium blanco/negro, **el más cercano al target de Hazing**. Robar: sans a 12px, transform de imagen a 700ms `cubic-bezier(0.4, 0, 0.2, 1)`, grid de 12 columnas con 4-6 visibles.

Contraste útil: Jacquemus usa nav en gris `#444` (no negro puro, mismo patrón "casi-negro"); Everlane confirma ratios 3:4 y 4:5 en CSS; Kith lleva el tracking en mayúsculas al extremo (2.4px sobre 12px) para el registro street.

### 8.2 Tipografía

- **UI / body / nav:** `Inter` variable — grotesca neutral, mismo carácter que las custom de las referencias.
- **Display / wordmark:** `Archivo` 700-900 con tracking positivo.
- **Prohibido:** Bebas Neue y condensadas genéricas — marcan template barato.
- **Escala:** nav/labels 12-13px · body 15-16px (16px es el mínimo del proyecto) · precios 14-16px · H1 32-40px mobile / 56-72px desktop.
- **Tracking:** 0 a 0.01em en sentence-case · **0.08-0.15em en MAYÚSCULAS** (nav, labels, "AGOTADO", breadcrumbs). Mayúsculas sin tracking se ven aplastadas y baratas — es de los tells más fuertes.
- **Peso:** 400 default, 300 para líneas editoriales grandes. Nada de bold-everywhere.

### 8.3 Escala de grises

| Token | Hex | Uso | Contraste s/blanco |
|---|---|---|---|
| `ink` | `#171717` | texto principal (NUNCA `#000` puro) | ~17:1 |
| `ink-secondary` | `#404040` | subtítulos, labels | ~10:1 |
| `gray-700` | `#595959` | texto secundario, precios tachados | ~7:1 |
| `gray-500` | `#737373` | placeholder, terciario — solo ≥18px o bold | ~4.6:1 (AA large) |
| `gray-400` | `#A3A3A3` | **solo decorativo/disabled**, nunca texto | falla AA |
| `gray-border` | `#D4D4D4` | bordes, divisores | — |
| `gray-100` | `#EDEDED` | fondos sutiles, skeletons | — |
| `off-white` | `#FAFAFA` | fondo alterno de sección | — |
| `white` | `#FFFFFF` | fondo base | — |

Coincide casi 1:1 con la escala `neutral` de Tailwind — usable directo, sin custom palette compleja.

### 8.4 Layout

- **Grid de catálogo:** `repeat(2, 1fr)` en mobile (confirmado en The Row, Totême, Jacquemus, Acne) · 3-4 columnas desktop · 6-9 solo en mosaicos editoriales, nunca en catálogo estándar.
- **Aspect ratio:** un único ratio por contexto — `3/4` en PDP/lookbook, `4/5` en grilla de catálogo. **Nunca mezclar ratios en la misma fila.**
- **Border-radius:** `0` en imágenes de producto y product cards · `2-4px` máximo en botones/inputs · `9999px` solo en swatches de color, avatares y dots. Las 8 referencias, sin excepción.
- **Spacing:** base 8px (escala Tailwind default sirve), gutter 16-24px mobile / 24-32px desktop.

### 8.5 Movimiento

- **Micro-interacciones** (color, border, opacity en hover/focus): **150-250ms ease-in-out**.
- **Imagen** (zoom, scale, filter, swap en hover): **500-800ms** con `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Drawers/overlays** (carrito, menú): 300-500ms con easing dedicado.
- La **velocidad diferencial** — imagen lenta, UI rápida — es literalmente lo que se percibe como caro. No hacer todo lento ni todo rápido.
- **`prefers-reduced-motion`:** reemplazar todo transform/scale por opacity-only o instantáneo. Obligatorio.

### 8.6 Estados sin rojo ni verde

Monocromo real, no "casi monocromo con un rojo de emergencia". WCAG 1.4.1 exige que el color nunca sea el único portador de significado, así que forma + texto hacen todo el trabajo:

- **Éxito:** check relleno en `ink` sobre círculo negro + texto ("Agregado").
- **Error:** `×` en outline + texto explícito del error, mismo `ink`. Nunca solo un borde rojo.
- **Sin stock:** texto tachado + "Agotado" en `gray-700`, sin badge de color.
- **Poco stock:** texto plano ("Últimas 2 unidades") en `ink-secondary`, sin badge urgente — y solo con inventario real (veto heredado).
- **Variantes de botón:** diferenciar por peso/relleno (sólido / outline / texto), no por color.

### 8.7 Carrito y PDP

- **Cart drawer vs página:** el drawer favorece desktop; en mobile compite con conversión. Para Hazing (mobile-first) evaluar drawer con resumen mínimo + link a página completa. No asumir ganador universal sin data propia.
- **Sticky add-to-cart en PDP mobile:** barra fija con precio + talle + CTA. Aporta +5-12% de conversión según Baymard. Implementarla.

### 8.8 Anti-patrones — prohibidos explícitamente

- Carruseles con flechas grandes o dots de colores
- Badges rojos "OFERTA -20%" flotando sobre la imagen
- Countdown de urgencia falsa (ya vetado, se refuerza acá)
- Más de un color no-neutral compitiendo en la misma vista
- `box-shadow` marcado elevando cards — usar borde sutil `#D4D4D4`
- `border-radius` mayor a 8px en imágenes o cards
- Botones con radios o tamaños inconsistentes en la misma página
- Mayúsculas sin letter-spacing
- Mezclar ratios de imagen en una misma grilla
- Easing bounce/elastic — siempre ease-out, ease-in-out o cubic-bezier custom
- Popups de descuento al entrar

### 8.9 Los 8 tells de premium vs barato

1. Texto casi-negro `#171717`, nunca `#000` puro.
2. Cero radio en imágenes; radio chico solo en controles.
3. Un solo aspect-ratio por contexto.
4. Transición lenta solo en imagen (500-800ms), rápida en el resto (150-250ms).
5. Tracking nulo en minúsculas, amplio (0.08-0.15em) en mayúsculas.
6. Espacio en blanco generoso — ninguna referencia llena cada píxel.
7. Estado comunicado con tipografía y forma, jamás con badge saturado.
8. Grilla consistente y par; asimetría solo como decisión editorial explícita.
