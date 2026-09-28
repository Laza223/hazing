# 07 — Admin (Fase 7)

**Estado:** implementada (2026-09-28); falta la verificación con sesión de admin (§7, última entrada) · **Alcance (Lazar, 2026-09-28):** `admin/(panel)` calcado de glamify — pedidos, productos (variantes talle + color), categorías, cupones, reseñas, configuración (`Setting`) y arrepentimiento. Fuentes: handoff §6 Fase 7, ADR [0001](../decisions/0001-esquema-talles.md) (talles), CLAUDE.md (invariantes), reconnaissance del 2026-09-28 (§8).

La usuaria es **Dana, la dueña, no técnica**. Regla de producto: "tan simple que un niño lo entienda". Cada pantalla se diseña para que ella pueda cargar un producto con fotos sin ayuda.

## 1. Sub-fases

| Sub-fase | Qué | Depende de |
|---|---|---|
| **7.1 Base** | `/admin/login`, layout `admin/(panel)` con navegación, dashboard (ventas del día/semana, pedidos por estado), kit de UI del admin (`src/components/admin/*` + los primitivos de `src/components/ui/*` que falten), ajustes (`Setting`), arrepentimiento (lista + marcar procesada/rechazada), reseñas (aprobar/rechazar). | — |
| **7.2 Catálogo** | Productos (lista, alta, edición, baja lógica) con variantes talle + color, SKU autogenerado, fotos a Supabase Storage; categorías (2 niveles, prefijo SKU) con el fix de padre inactivo. | 7.1 |
| **7.3 Ventas** | Pedidos (lista con filtro por estado, detalle, cambio de estado por la máquina de estados, reposición de stock al cancelar), cupones (alta/edición/baja). | 7.1 |

7.2 y 7.3 corren en paralelo sobre archivos disjuntos. "Marcar despachado" + tracking es Fase 9 (envío), sobre el detalle de pedido de 7.3.

## 2. Qué se porta de glamify y qué no

- **Tal cual:** login, layout, dashboard (`lib/admin/dashboard/*`), `requireAdmin()` al principio de **cada** Server Action (no solo en el layout), `order-status-control`, reseñas, arrepentimiento, cupones, `lib/admin/{sku,slug,result}.ts`, `lib/images/compress.ts` (compresión en el navegador con Canvas, sin dependencias), subida server-side con la service-role a `product-images`.
- **Adaptar:** `lib/admin/products/{service,validation,images}.ts` y `variant-fields` a talle + color (ADR 0001); `lib/admin/orders/service.ts` sin la rama de combos; ajustes contra el `Setting` de Hazing.
- **No se porta:** combos (todo), `micorreo-panel`, auto-import, Zipnova. `weightGr` tampoco en esta fase: lo agrega la Fase 9 (ADR 0004) junto con la cotización en vivo.

## 3. Decisiones de diseño de esta fase

1. **Estética:** los tokens de Hazing (`ink`/`paper`/grises, Inter, `rounded-control`, foco con `outline`), sin nada de motion/Lenis/three. El admin es una herramienta: densidad media, tipografía de UI (sin Archivo display salvo el wordmark), sin animación coreografiada. Las reglas de estados sin rojo ni verde también aplican: estado = texto + forma.
2. **Navegación:** barra lateral en desktop, menú desplegable en mobile (Dana va a cargar desde el celular). Secciones en su idioma: "Pedidos", "Productos", "Categorías", "Cupones", "Reseñas", "Arrepentimientos", "Ajustes".
3. **Alta de producto en una sola pantalla**, en este orden: Fotos → Nombre y precio → Categoría → Talles y colores → Descripción → (plegado) "Más opciones" (precio anterior, SEO, destacado, categorías extra). Lo obligatorio arriba, lo avanzado escondido.
4. **Fotos:** botón grande "Agregar fotos" (acepta varias a la vez, también desde la cámara del celular), compresión en el navegador antes de subir, miniaturas con "Portada" en la primera, mover con botones "←/→" (sin drag and drop: accesible y funciona igual en touch) y "Quitar". Máx. 5 MB por archivo después de comprimir. El texto de ayuda dice "Solo fotos reales de la prenda" (Ley 24.240).
5. **Variantes como grilla talle × color:** Dana elige el sistema de talles ("Letras XS–XXL", "Números 34–50", "Talle único"), tilda los talles, agrega colores por nombre (+ swatch opcional), y el formulario genera una fila por combinación con stock (y precio distinto opcional). El `name` de la variante (`"M · Negro"`) y el SKU no se tipean: se derivan en el servicio. Cambiar el sistema de talles de un producto con variantes existentes pide confirmación.
6. **SKU:** `{PREFIJO}-{NNNN}` por variante, secuencial por prefijo de la categoría primaria, calculado dentro de la transacción; si choca el `@unique` (P2002) se reintenta una vez (patrón de glamify). No se muestra como campo editable.
7. **Baja de producto:** lógica (`deletedAt`), nunca física: los `OrderItem` apuntan a variantes.
8. **Categorías — padre inactivo:** el admin **impide** desactivar una categoría con subcategorías activas ("Primero desactivá sus subcategorías: …") y, como defensa, `buildCategoryTree` ya no promueve a raíz una hija cuyo padre está inactivo: la oculta. Se eligió impedir (no cascada) porque la cascada apaga categorías sin que Dana lo vea.
9. **Pedidos:** las transiciones posibles salen de `canTransition` (`lib/orders/state-machine.ts`); la UI solo muestra los botones válidos, con texto claro ("Marcar en preparación"). Cancelar un pedido pagado repone stock (servicio de glamify) y pide confirmación.
10. **Bucket de fotos:** `product-images`, público de lectura, escritura solo con la service-role desde el Server Action. Lo crea Lazar (ver §6).

## 4. Cómo se cierra cada sub-fase

Juez en verde (`format:check`, `lint`, `typecheck`, `test`) · `pnpm build` sin three/lenis en el bundle del admin y JS inicial ≤ 220 KB gz por ruta · E2E del flujo (login admin → alta de producto → aparece en `/tienda`) con axe sin violaciones · verificación de UX en navegador (desktop y mobile) y revisión adversarial con contexto fresco, por agentes distintos de quien implementó.

## 5. Pendientes conocidos

- `weightGr` en el formulario de producto: Fase 9.
- "Marcar despachado" + tracking + email de despacho: Fase 9.

## 6. Datos y configuración que necesita la Fase 7

1. **Bucket `product-images`** en Supabase Storage (medido 2026-09-28: el proyecto no tiene ningún bucket). Público, límite 5 MB, MIME `image/jpeg, image/png, image/webp, image/avif`.
2. **Usuario owner de Dana:** alta en Supabase Auth + fila `User` con `role = owner` (checklist de lanzamiento, Fase 10).

## 7. Ledger de delegaciones

- 2026-09-28 · reconnaissance del port del admin (Sonnet, ~85 k tokens, 40 llamadas, 4 min) → mapa de §2, bug de categorías localizado en `buildCategoryTree` (filtra inactivas antes de armar el árbol y la hija huérfana cae a raíz), sin dependencias nuevas (todos los `@radix-ui/*` ya están).
- 2026-09-28 · implementación 7.1 (Sonnet, ~195 k tokens, 112 llamadas, 15 min) → juez verde, 326 tests; build no verificable por el lock de Prisma con otros procesos en paralelo (lo corre la sesión principal). Desvíos: `Checkbox` nativo (no hay `@radix-ui/react-checkbox`), `dialog`/`skeleton` agregados al kit, servicio de moderación propio en `lib/admin/reviews/` (duplica en parte `lib/reviews/` de la 6.4: a unificar en la revisión).
- 2026-09-28 · implementación 7.2 (productos + categorías) y 7.3 (pedidos + cupones) lanzadas en paralelo sobre archivos disjuntos.
- 2026-09-28 · implementación 7.3 (Sonnet, 16 archivos, ~2130 líneas, 28 tests nuevos) → juez verde en lo suyo. Desvíos: un solo `changeOrderStatus` que repone stock al cancelar **o reembolsar** un pedido pagado/en preparación (glamify solo en `cancelOrder`); cupones sin borrado físico (solo activar/desactivar: `Order` los referencia); selector real de categoría/producto para el alcance del cupón.
- 2026-09-28 · implementación 7.2 (Sonnet, ~273 k tokens, 131 llamadas, 17 min) → juez verde, 449 tests en total. Desvíos: ≥ 1 variante obligatoria (glamify autocreaba "Único"), grilla talle × color nueva, `Link` con `buttonVariants` (el `Button` de Hazing no tiene `asChild`), `window.confirm` al cambiar el sistema de talles. Dudoso: destildar un talle borra variantes con `deleteMany` aunque estén en un carrito o pedido.
- 2026-09-28 · en la sesión principal: juez integrado verde (6.4 + 7 + 8) y `next build` con todas las rutas ≤ 180 kB de First Load JS (admin ≤ 160 kB), gates de three/lenis en 0 y sin imports de motion en el admin. `pnpm build` completo bloqueado por el lock de Prisma de un `next dev` ajeno en el puerto 3002: el cliente ya estaba generado con el schema sin cambios, se corrió `next build` directo.
- 2026-09-28 · revisión adversarial Fase 7 (Sonnet, ~108 k tokens, 46 llamadas, 5 min) → aprobada con reservas. `requireAdmin()` en las 15 Server Actions, login rechaza clientas. Hallazgos: variantes destildadas borradas con FK de `CartItem` (guardado entero falla), cambio de estado sin guarda atómica (doble reposición de stock), reparentar una categoría con hijas crea 3 niveles, fechas de cupón en UTC (cortan 3 h antes), `SelectItem` sin outline de foco, colisión de SKU manual. Duplicación de servicios de reseñas sin divergencia de reglas: se deja. Corrección delegada (Sonnet).
- 2026-09-28 · correcciones de la revisión (Sonnet, ~213 k tokens, 108 llamadas, 15 min en dos tandas) → variantes con referencias se desactivan (no se borran) y re-tildar reactiva la misma fila; guarda atómica `updateMany` por estado antes de reponer stock; no se puede reparentar una categoría con hijas; fechas de cupón a 00:00 / 23:59:59.999 ART; outline en `SelectItem`; SKU siempre autogenerado en variantes nuevas. Segunda tanda: el form de edición trae también las variantes inactivas (si no, el switch "Activa" se deshacía al guardar); armado de la grilla extraído a `variant-grid.ts` con tests. Juez verde, 473 tests.
- 2026-09-28 · estado al commitear: juez verde (479 tests), build con el admin ≤ 160 kB y sin motion, E2E sin sesión (redirecciones a `/admin/login`, login inválido, axe desktop + mobile) en verde, dos revisiones adversariales con correcciones re-verificadas. **Pendiente para cerrar la fase:** E2E con sesión de admin (alta de producto con fotos → aparece en `/tienda`) y verificación de UX del panel en navegador, desktop y mobile: requieren una usuaria owner de prueba y el bucket `product-images` (§6).
