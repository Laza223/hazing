# 02 — Funcional

Fuente: [`00-handoff.md`](00-handoff.md) §1, §2, §3. Entidades y flujos se detallan en el schema Prisma (Fase 3); acá va el mapa funcional de alto nivel.

## Entidades (heredadas de glamify, sin cambio de forma salvo lo anotado)

`Category` (jerárquica, 2 niveles) · `Product` (+ `sizeSystem`, ver [ADR 0001](../decisions/0001-esquema-talles.md)) · `ProductVariant` (talle + color, no tono) · `Customer` · `Address` · `Review` · `Cart` / `CartItem` · `Order` / `OrderItem` · `Payment` · `ShippingZone` (única fuente de costo de envío, no fallback) · `Shipment` (transiciones manuales, no webhook de courier) · `Coupon` / `CouponRedemption` · `User` (staff) · `Setting` · `RetractionRequest`.

`Combo`/`ComboItem`: en glamify existen; para Hazing es REQUIRE INPUT en Fase 3 (¿la dueña vende combos de ropa? no está en el handoff).

## State machines (heredadas tal cual)

- `OrderStatus`: `pending_payment → paid → preparing → shipped → delivered` | `cancelled` | `refunded`.
- `PaymentStatus`: espejo de MercadoPago.
- `ShipmentStatus`: `pending → ready → dispatched → in_transit → delivered` | `returned` — en Hazing las transiciones las dispara la dueña a mano desde el panel (botón "marcar despachado" + tracking freeform), no un webhook de courier.

## Flujos

- **Storefront:** home → catálogo (por categoría/subcategoría) → PDP (talle + color) → carrito → checkout (un paso) → MercadoPago → confirmación. Cuenta de clienta opcional (compra de invitada soportada, como en glamify).
- **Admin:** login → productos (con variantes talle/color) → categorías → pedidos (ver estado, marcar despachado con tracking freeform) → cupones → reseñas (moderación) → configuración (`Setting`, incluida la tabla de zonas de envío).
- **Envío manual:** al confirmar pago, el pedido queda `preparing`. La dueña arma el paquete fuera del sistema, elige Correo Argentino o Mercado Envíos por su cuenta (decisión suya, no del código), y desde el panel marca "despachado" + carga tracking (texto libre, sin validar contra ninguna API).
- **Botón de Arrepentimiento:** `/arrepentimiento`, obligatorio por Res. 424/2020 / Art. 34 Ley 24.240, constancia `ARR-NNNNNN` (secuencia autoincrement). Copiado exacto de glamify — no es específico de maquillaje.

## Cuestionario de decisiones pendientes

Ver tabla en [`01-negocio.md`](01-negocio.md). Ninguna de las pendientes bloquea Fases 1-2; #5 (talles) ya se resolvió y desbloquea Fase 3.
