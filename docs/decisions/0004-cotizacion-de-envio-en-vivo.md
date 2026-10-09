# ADR 0004 — Cotización de envío en vivo (MiCorreo), igual que glamify

**Estado:** Aceptada por Lazar el 2026-09-24 · **Bucket:** D-PROYECTO · **Revierte en parte:** `docs/spec/00-handoff.md` §2.2 ("sin API de envío, `ShippingZone` única fuente")

## Problema

El handoff (2026-09-03) decidió que Hazing no integra ninguna API de envío: `ShippingZone` como única fuente de costo, despacho manual. Con eso el precio que ve la clienta en el checkout es una tabla cargada a mano, no lo que cobra Correo Argentino. En ropa (más peso y volumen que maquillaje) el desvío se nota más, y la dueña tendría que recalibrar la tabla a mano cada vez que cambien las tarifas.

Glamify ya resolvió esto y corre en producción: cotiza en vivo con la API oficial de MiCorreo y usa la tabla de zonas solo como fallback.

## Alternativas descartadas

1. **`ShippingZone` como única fuente (la decisión original).** Descartada: el precio del checkout se aparta del costo real y hay que mantener la tabla a mano.
2. **Zipnova / Zippin.** Descartada, y ya lo estaba en glamify: markup ~94% sobre MiCorreo directo, medido en vivo con el mismo paquete y el mismo transportista ($11.877 vs $6.113). Zipnova cobró el mismo número en tres distancias distintas, así que no es un tema de distancia. Detalle en `glamify-makeup/docs/decisions/0001-shipping-provider.md`.
3. **Automatizar también el despacho (auto-import del pedido a MiCorreo).** Fuera de v1. La cotización y el despacho son cosas separadas: se automatiza el precio, no el envío. Revisable cuando el volumen haga que cargar envíos a mano duela.

## Decisión

El **cálculo de envío es idéntico al de glamify** (`src/lib/shipping/index.ts`), en este orden:

1. Subtotal sobre el umbral de envío gratis → costo 0.
2. Cotización en vivo con la **API oficial de MiCorreo** (PAQ.AR Clásico, origen CP 6700 Luján). Usa solo CP de destino, peso y método (domicilio o sucursal, cotizados por separado). No mira medidas ni valor declarado. El precio cotizado es lo que se cobra.
3. Si MiCorreo no responde o no hay credenciales → fallback a `ShippingZone`, con `methodFactor` (sucursal = 0.7× domicilio) porque la tabla guarda un solo precio por zona.

El **despacho sigue 100% manual**, sin cambios respecto del handoff:

- La dueña arma y despacha el paquete desde Correo Argentino, fuera del sistema.
- Desde el admin marca "despachado" y carga el código de seguimiento (texto libre). El pedido pasa a `shipped` y sale el email a la clienta con el código; también se muestra en su cuenta.
- El link de seguimiento es la página fija de Correo Argentino (`CORREO_TRACKING_URL`). Esa página **no acepta el número por query string** (verificado en glamify el 2026-08-27), así que el código se muestra aparte para que la clienta lo pegue.
- No hay auto-import ni webhook de courier. `ShipmentStatus` avanza a mano.

## Reversibilidad

Barata de revertir: el fallback a `ShippingZone` queda siempre activo. Sacar las credenciales de MiCorreo del entorno devuelve Hazing al comportamiento del handoff sin tocar código.

## Consecuencias aceptadas

- **Se portan de glamify:** `src/lib/shipping/index.ts`, `micorreo.ts`, `quote.ts` (reemplaza el `quote.ts` solo-zonas que Hazing tiene hoy) y `tracking.ts`.
- **No se portan:** `zipnova.ts` y `correo.ts` (cancelados/huérfanos en glamify) ni `src/lib/orders/auto-shipment.ts` (auto-import).
- **Peso por prenda.** La cotización necesita `weightGr`, que el port actual quitó. Hay que reincorporarlo como en glamify (peso por producto/variante y snapshot en `Order`). Como `prisma/migrations` todavía no existe (Fase 3 real sin aplicar), es un cambio de `schema.prisma` antes de la primera migración, no una migración nueva. La dueña tiene que cargar el peso de cada prenda: dato de negocio, no de código.
- **Secrets nuevos** (Cloudflare Secrets y `.env.local`, nunca en git): `MICORREO_EMAIL`, `MICORREO_PASSWORD`, `MICORREO_GATEWAY_AUTH`, `MICORREO_SANDBOX`; opcionales `MICORREO_VELOCITY` y `MICORREO_ORIGIN_CP`. Necesitan credenciales de una cuenta MiCorreo de la dueña de Hazing (a confirmar que existe; no se reutilizan las de glamify).
- **La tabla `ShippingZone` se sigue manteniendo** como fallback, calibrada a costo real de ropa.
- **Cuándo:** la cotización se consume en el checkout (Fase 8) y el despacho manual es Fase 9. La cotización tiene que estar antes de cerrar el checkout.
