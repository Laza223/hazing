# 08 — Checkout + MercadoPago (Fase 8)

**Estado:** implementada (2026-09-28); falta la compra de punta a punta en el sandbox de MP (§6, última entrada) · **Alcance (Lazar, 2026-09-28):** UI de `/checkout`, Route Handler `/api/webhooks/mercadopago`, páginas de resultado, "Finalizar compra" en el carrito, emails transaccionales con Resend. Se desarrolla con credenciales de **test** de MP. Fuentes: handoff §6 Fase 8, CLAUDE.md (MercadoPago, invariantes), reconnaissance del 2026-09-28 (§7).

## 1. Punto de partida (medido)

Todo lo transaccional ya está portado de glamify y testeado: `lib/orders/{checkout-service,webhook-service,stock,state-machine,order-number,expiry*}.ts`, `lib/payments/*`, `lib/email/*` (salvo el email de despacho, que es Fase 9). Diferencias con glamify: sin combos, sin auto-import de envíos, sin `weightGr` (Fase 9). La Fase 8 es **cablear UI + Route Handler**, no reescribir dominio.

## 2. Sub-fases

| Sub-fase | Qué | Depende de |
|---|---|---|
| **8.1 Checkout** | `/checkout` (Server Component + form cliente), Server Actions `quoteShippingAction` y `createCheckoutAction`, "Finalizar compra" en `/carrito` y en el drawer, `/checkout/gracias` con los tres estados. | 6.4 (sesión de clienta) |
| **8.2 Webhook** | `src/app/api/webhooks/mercadopago/route.ts` (port literal de glamify, 31 líneas) + test de integración del handler. | — |

## 3. Decisiones de diseño

1. **Una sola página de checkout**, sin pasos con navegación: Contacto (nombre, email, teléfono) → Entrega → Resumen con totales → checkbox de Términos (obligatorio, link a `/terminos`) → "Pagar con MercadoPago". Clienta logueada: nombre/email/teléfono prellenados y su última dirección (`Address` con `isDefault`) precargada. Invitada: permitida sin cuenta (el contacto queda en `Order`).
2. **Entrega en la Fase 8: solo envío a domicilio**, con la cotización actual por `ShippingZone` (`lib/shipping/quote.ts`). El retiro en sucursal necesita el listado de sucursales de MiCorreo y entra con la Fase 9 (ADR 0004), igual que la cotización en vivo. El costo se recalcula en el server al crear la orden (el del cliente es solo informativo).
3. **Sin zona que matchee** (`quoteShipping` tira): mensaje claro "Todavía no tenemos costo de envío para ese código postal. Escribinos y lo resolvemos" con link a `/contacto`, y no se puede pagar. No se inventa un costo.
4. **Envío gratis:** si `Setting.freeShippingThreshold` es null, no hay envío gratis (no se hereda el 47500 de glamify).
5. **Resultado:** una sola ruta `/checkout/gracias?orden=…` (las tres `back_urls` de MP apuntan ahí, como glamify), que lee el estado **real** del pedido en la DB — la fuente de verdad es el webhook, no el query param de MP — y muestra uno de tres estados:
   - *Pagado* (`paid` en adelante): "¡Gracias! Tu pedido HZG-… está confirmado", resumen, "Te mandamos el detalle por email".
   - *Pendiente* (`pending_payment` sin rechazo): "Estamos confirmando tu pago", se refresca solo cada 5 s hasta 1 min (sin spinner eterno) y después deja el texto.
   - *No se acreditó* (último `Payment` `rejected`/`cancelled`, o MP volvió con `status=rejected`/`null`): "El pago no se completó", con "Volver a intentar" que reabre el checkout de MP de la misma preferencia (`init_point` guardado o reconstruido por `pref_id`) mientras el pedido siga `pending_payment`.
   - El número de pedido del query param solo muestra datos no sensibles (número, estado, ítems y total). Nunca dirección ni email completos.
6. **Carrito tras crear la orden:** se marca `ordered` dentro de la misma transacción (ya lo hace `checkout-service`), antes de ir a MP. Si el pago falla, la clienta reintenta desde el resultado; el pedido impago lo cancela el cron de expiración.
7. **Errores de MP** (timeout, caída): mensaje en castellano, nunca el texto técnico (patrón de glamify con `AbortSignal.timeout`).
8. **Analítica:** los puntos `begin_checkout` y `purchase` quedan marcados y sin llamada hasta que se decida PostHog (Fase 10).
9. **Webhook:** runtime Node (default), ignora tópicos que no son `payment`, 401 con firma inválida, 200 idempotente en el resto. `notification_url` = `${NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`.

## 4. Cómo se cierra cada sub-fase

Juez en verde · `pnpm build` con `/checkout` ≤ 220 KB gz · E2E: carrito → checkout → validaciones → creación de orden hasta el redirect a MP (con MP mockeado o credenciales de test), resultado en los tres estados sembrando el pedido; axe sin violaciones en `/checkout` y `/checkout/gracias` · compra real de punta a punta con tarjeta de prueba de MP en el sandbox, verificando webhook → `paid` → stock descontado → emails · verificación de UX y revisión adversarial con contexto fresco.

## 5. Configuración que necesita (la carga Lazar)

`MP_ACCESS_TOKEN` (test) y `MP_WEBHOOK_SECRET` en `.env.local`; webhook de la aplicación de MP apuntando a `https://www.hazing.store/api/webhooks/mercadopago` (evento "Pagos"); `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_OWNER_EMAIL`. Para probar el webhook contra el entorno local hace falta un túnel o probar sobre un deploy de preview.

## 6. Ledger de delegaciones

- 2026-09-28 · reconnaissance checkout + MP (Sonnet, ~96 k tokens, 31 llamadas, 4 min) → lo transaccional ya portado y cubierto por tests; faltan UI, Route Handler y actions; `quoteShipping` de Hazing no recibe método ni devuelve `source` (se extiende en Fase 9).
- 2026-09-28 · implementación 8.1 + 8.2 (Sonnet, ~180 k tokens, 103 llamadas, 10 min) → juez verde, 449 tests. Único cambio en `lib/payments`: `back_urls` con `?orden=`. No persiste `Address` al pagar (glamify tampoco). E2E escrito sin correr.
- 2026-09-28 · revisión adversarial Fase 8 (Sonnet, ~82 k tokens, 28 llamadas, 3 min) → aprobada con reservas; núcleo transaccional sólido (montos 100 % server, guardas atómicas, firma). Hallazgos: `/checkout/gracias?orden=HZG-…` es enumerable (número secuencial) y muestra ítems y total de pedidos ajenos → pasa a identificarse por `Order.id` (UUID, el `external_reference` de MP); errores del form sin `aria-describedby` ni foco al primer error; provincia y largos sin validar en el server.
- 2026-09-28 · correcciones de la revisión (Sonnet, ~138 k tokens, 89 llamadas, 10 min) → `/checkout/gracias?pedido=<Order.id>` (UUID validado antes de consultar; un número de pedido no resuelve nada), errores por campo con `aria-invalid`/`aria-describedby` y foco al primero (`TextInput` con prop `error`), provincia contra `AR_PROVINCES` y largos máximos en el server.
- 2026-09-28 · re-verificación con contexto fresco de las correcciones de Fase 7 y 8 (Sonnet, ~98 k tokens, 47 llamadas, 5 min) → las 9 confirmadas con tests que fallan al revertir. Regresión expuesta: al poder desactivarse una variante que está en un carrito, el checkout podía crear la orden y cobrar en MP una prenda discontinuada o sin stock (el webhook no descontaba stock y avisaba a la dueña, pero ya había cobrado). Corregido en la sesión principal: `unavailableLines` (`lib/cart/availability.ts`) frena `createCheckoutAction` si alguna línea tiene variante o producto inactivo/borrado o stock menor a la cantidad, antes de crear la orden.
- 2026-09-28 · en la sesión principal: sin `RESEND_API_KEY` en producción o sin `RESEND_OWNER_EMAIL`, el mail no enviado ahora deja un `console.error` en los logs de Vercel (antes, info de desarrollo o nada). E2E completo: 62 pasan, 2 salteados (flujos con sesión, pendientes de usuarias de prueba); el único rojo intermedio era del test (el `#__next-route-announcer__` también tiene `role=alert`).
- 2026-09-28 · estado al commitear: juez verde (479 tests), `/checkout` 150 kB, E2E 60/60 + 2 salteados, axe sin violaciones, UX verificada en navegador (tres estados del resultado sembrando pedidos en la base local y borrándolos después). **Pendiente para cerrar la fase:** compra real en el sandbox de MP con tarjeta de prueba (webhook → `paid` → stock → emails), que necesita `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET` de test (§5) y un deploy de preview o un túnel para recibir el webhook. **Bloqueante para vender, medido en Supabase el 2026-09-28:** hay 0 filas en `ShippingZone`, así que hoy ningún CP cotiza y no se puede pagar. Se resuelve en la Fase 9 (pantalla de zonas en el admin y valores de la dueña).
