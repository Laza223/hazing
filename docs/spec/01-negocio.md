# 01 — Negocio

Fuente: [`00-handoff.md`](00-handoff.md) §3, §7. Condensado para lectura rápida — el handoff manda si hay divergencia.

## Qué es

Ecommerce B2C de ropa femenina, mercado argentino, envíos a todo el país desde Luján (CP 6700).

## Quién

Dueña: cuñada de Lazar. Persona física, sin monotributo ni razón social (decisión de timing, ya resuelta — no se re-litiga). Usuaria única del panel admin; no es una persona técnica ("tan simple que un niño lo entienda", regla heredada de glamify).

## Canales

- Storefront web (venta).
- WhatsApp / Instagram: contacto, nunca checkout (mismo patrón que glamify).

## Fiscal (no bloquea el build)

MercadoPago solo pide CUIT/CUIL vinculado a la cuenta receptora — cualquier persona con DNI tiene CUIL, no implica inscripción AFIP. No se construye módulo de facturación en v1. `Order`/`OrderItem` quedan con snapshot de nombre/monto/fecha suficiente para facturar después, con cualquier CUIT que se decida, dentro o fuera del sistema.

## Decisiones de negocio — estado

Ver [`00-handoff.md` §3](00-handoff.md) para el detalle completo. Resumen:

| # | Decisión | Estado | Bloquea |
|---|---|---|---|
| 1 | Cuentas e infraestructura separadas de glamify | RESUELTA | — |
| 2 | Paleta blanco/negro/grises, "hiper mega premium" | RESUELTA | Fase 5 |
| 3 | Origen de despacho: Luján CP 6700 | RESUELTA | — |
| 4 | Costo de envío: cotización en vivo MiCorreo como glamify ([ADR 0004](../decisions/0004-cotizacion-de-envio-en-vivo.md)); fallback `ShippingZone` (tabla de glamify como punto de partida) | PARCIAL | Fase 9 |
| 5 | Esquema de talles | **RESUELTA** (2026-09-03, ver [ADR 0001](../decisions/0001-esquema-talles.md)) | Fase 3 |
| 6 | CUIT/CUIL para MercadoPago | PENDIENTE | Fase 8 (conectar cuenta real) |
| 7 | Dominio | PENDIENTE | Fase 10 (deploy final) |
| 8 | Política de cambios/devoluciones | PENDIENTE | Fase 6 (páginas legales) |
| 9 | Umbral de envío gratis | PENDIENTE | Fase 3/9 (`Setting.freeShippingThreshold`) |
| 10 | Facturación | DIFERIDA (v1 no la construye) | — |

## Vetos de producto (no reproponer)

Heredados de glamify + nuevos de Hazing — ver [`00-handoff.md` §5](00-handoff.md) y §8.8 (anti-patrones de diseño):

- Efectivo/offline (Rapipago/Pago Fácil): excluido.
- Reembolsos automáticos por API: descartado, manual + registro admin.
- Emojis como íconos: prohibido (Lucide SVG).
- Stock falso / urgencia falsa: prohibido.
- Deploy fuera de Vercel: descartado salvo ADR nuevo (era Cloudflare Workers hasta el ADR 0005, 2026-09-24).
- Auto-import/despacho por API de courier y Zipnova en v1: descartados. La cotización en vivo con MiCorreo SÍ va (ADR 0004).
- Facturación automática en v1: descartada.
- Popups de descuento al entrar, badges rojos, countdowns de urgencia: prohibidos (§8.8).
