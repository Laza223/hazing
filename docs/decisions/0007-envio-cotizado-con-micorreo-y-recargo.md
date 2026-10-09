# ADR 0007 — Envío: cotización de MiCorreo + recargo fijo, despacho manual con cualquier courier

**Estado:** aceptado por la dueña (Dana) y Lazar, 2026-10-08 · **Complementa:** ADR [0004](0004-cotizacion-de-envio-en-vivo.md) (cotización en vivo con MiCorreo, como glamify) y reemplaza el envío provisorio de precio único de [09-envios.md](../spec/09-envios.md).

## Problema

La dueña despacha con **Via Cargo** (le queda cerca), pero Via Cargo no tiene API pública de cotización: solo se integra vía apps de plataformas como Tiendanube. Sin cotización, el checkout tendría que usar una tabla de precios por zona mantenida a mano.

## Alternativas descartadas

1. **Tabla de zonas con precios de Via Cargo cargados por la dueña:** exacta pero exige mantener 6–7 precios a mano cada vez que Via Cargo actualiza tarifas. La dueña prefirió no hacerlo ("no nos volvamos locos").
2. **API de Via Cargo:** no es pública; requiere acuerdo comercial sin plazo conocido.

## Decisión

- El checkout **cotiza en vivo contra MiCorreo** (Correo Argentino, port de glamify, cuenta de MiCorreo de la dueña) y **suma un recargo fijo** (`Setting.shippingSurcharge`, default $2.000, editable en Ajustes) como margen para cubrir la diferencia con el courier que use.
- Métodos: **domicilio**, **sucursal** (la tienda le avisa por mail en qué sucursal retirar al despachar) y **retiro en Luján** gratis (se coordina por WhatsApp).
- Envío gratis por umbral (`Setting.freeShippingThreshold`, hoy $87.900).
- Si MiCorreo no responde, se usa el precio de respaldo de Ajustes (zona "Todo el país") tal cual; si tampoco hay, no se puede pagar.
- **Despacho 100% manual con el courier que elija:** en el pedido, "Marcar despachado" con empresa, código y link de seguimiento libres; la clienta recibe un mail con esos datos. Nada se importa a MiCorreo ni a ningún courier.
- Peso estimado: 400 g por prenda, mínimo 500 g, un paquete de 25×20×5 cm. No se carga peso por producto (la ropa es homogénea; se ajusta si la cotización se aleja de la realidad).

## Riesgos aceptados

- El precio cobrado no es el de Via Cargo: en algunos destinos el margen puede ser mayor o menor a $2.000. La dueña lo acepta y puede cambiar el recargo cuando quiera.
- La credencial de gateway de MiCorreo es la misma que usa glamify (secreto compartido del ecosistema de plugins, ver ADR 0001 de glamify): si se rota, la cotización cae al precio de respaldo, sin romper el checkout.

## Reversibilidad

Media: cambiar a tabla de zonas es usar el fallback que ya existe; el recargo es un valor de Ajustes.
