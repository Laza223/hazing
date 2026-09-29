# 09 — Envíos (Fase 9)

**Estado: PROVISORIO — pendiente de hacerse bien en una sesión dedicada** (decisión de Lazar, 2026-09-29). Lo que hay hoy alcanza para que el checkout cotice y se pueda vender; no es el diseño final del ADR [0004](../decisions/0004-cotizacion-de-envio-en-vivo.md).

## 1. Qué hay hoy (provisorio)

- **Un solo precio para todo el país.** Ajustes → "Costo de envío a todo el país" mantiene una única `ShippingZone` llamada "Todo el país" (CP 1000–9999, `order` 999). Código: `src/lib/admin/shipping-zone.ts`. Vacío = zona apagada: el checkout no cotiza y no deja pagar.
- El checkout cotiza con `src/lib/shipping/quote.ts` (solo zonas; gratis por umbral si `Setting.freeShippingThreshold` tiene valor) y **solo ofrece envío a domicilio**.
- El despacho es manual: `ShipmentStatus` avanza a mano, pero **todavía no hay** "marcar despachado" ni tracking en el detalle del pedido (hoy el bloque "Entrega" es de solo lectura) ni email de despacho.
- Cualquier zona por provincia o por rango que se cargue después con `order` menor le gana a la de todo el país (cubierto por test).

## 2. Qué falta (la sesión de envíos)

1. Cotización en vivo con MiCorreo (ADR 0004): portar de glamify `shipping/{index,micorreo,quote,tracking}.ts`. Sin `zipnova.ts`, `correo.ts` ni `orders/auto-shipment.ts`.
2. `weightGr` en `Product`/`Order` (migración) y peso en el formulario de producto.
3. Orden de cotización: gratis por umbral → MiCorreo en vivo → fallback `ShippingZone`.
4. Retiro en sucursal (necesita el listado de sucursales de MiCorreo) y el selector en el checkout.
5. Admin: pantalla de zonas (alta/edición por provincia y por rango, valores de la dueña, ajustados al alza por peso/volumen de ropa) y reemplazo del campo provisorio de Ajustes.
6. "Marcar despachado" + tracking de texto libre en el detalle del pedido, y `shipmentDispatchedEmail`.
7. `quoteShipping` de Hazing hoy no recibe método ni devuelve `source` (glamify sí): extender junto con `checkout-service.ts`.

## 3. Datos pendientes de la dueña

Valores de `ShippingZone` (handoff §3.4) y umbral de envío gratis (#9). Mientras tanto, el precio único de Ajustes lo carga ella o Lazar.
