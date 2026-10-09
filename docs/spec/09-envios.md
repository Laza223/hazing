# 09 — Envíos (Fase 9)

**Estado:** implementada (2026-10-08) según el ADR [0007](../decisions/0007-envio-cotizado-con-micorreo-y-recargo.md): cotización en vivo de MiCorreo + recargo, retiro en Luján y despacho manual con cualquier courier. Reemplaza el precio único provisorio del 2026-09-29.

## 1. Cómo cotiza el checkout

Orden (`src/lib/shipping/quote.ts`):

1. **Retiro en Luján** → $0 (se coordina por WhatsApp).
2. **Envío gratis** si el subtotal ≥ `Setting.freeShippingThreshold` (hoy $87.900; vacío = nunca).
3. **MiCorreo en vivo** (`src/lib/shipping/micorreo.ts`, port de glamify): domicilio (D) o sucursal (S), origen 6700, Clásico, 400 g por prenda (mínimo 500 g), paquete 25×20×5 cm. Al resultado se le suma `Setting.shippingSurcharge` (default $2.000, editable en Ajustes).
4. **Respaldo:** si MiCorreo no responde, la zona "Todo el país" de Ajustes, sin recargo.
5. Si no hay nada: no se puede pagar; el checkout ofrece el retiro y el link a /contacto.

El costo se recalcula siempre en el server al crear la orden; el que ve la clienta es informativo.

Variables (Vercel y `.env.local`, cargadas por Lazar el 2026-10-08): `MICORREO_EMAIL`, `MICORREO_PASSWORD` (cuenta de MiCorreo de la dueña), `MICORREO_GATEWAY_AUTH` (la misma de glamify). Opcionales: `MICORREO_SANDBOX`, `MICORREO_ORIGIN_CP`, `MICORREO_VELOCITY`. Verificado con el probe de glamify contra la API real: Luján → La Plata (1900), 500 g, domicilio $8.955 / sucursal $6.480.

## 2. Despacho

Manual, con el courier que elija la dueña (hoy Via Cargo). En el detalle del pedido: "Marcar despachado" con empresa, código y link de seguimiento (https, opcional). Pasa el pedido a enviado y le manda a la clienta un mail con esos datos. Corregir el código reenvía el mail; corregir empresa o link no. Los pedidos de retiro no tienen formulario de despacho.

## 3. Ledger de delegaciones

- 2026-10-08 · implementación (Sonnet, ~150 k tokens, 50 llamadas, 10 min) → port de MiCorreo, orquestador con recargo y retiro, checkout con 3 métodos, Ajustes, despacho con mail, migración `20261008120000_shipping_live_quote`; juez verde (542 tests).
- 2026-10-08 · en la sesión principal: spike de la cuenta de MiCorreo de la dueña con el probe de glamify; bug del formulario de Ajustes (`step` de 500/100 en los montos hacía que el navegador rechazara $87.900 en silencio) → `step="0.01"`.
