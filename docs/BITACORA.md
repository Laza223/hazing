# Bitácora

Una línea por cierre de sesión, escrita sola por el hook de cierre.
Solo historia — lo que se hizo, que no caduca. Lo vigente vive en `.claude/ESTADO.md`;
lo que está abierto se consulta en los PRs y el CI, no se escribe acá.

- **2026-09-03 05:34** `main` — talles decididos (ADR 0001, mixto por producto), repo+docs/spec+CLAUDE.md+config, juez verde (format/typecheck/lint/test/build) verificado con contexto fresco, commit inicial `58493c2`
- **2026-09-03 06:04** `main` — sin combos aplicado, schema Prisma completo (catálogo talle/color, envío manual, sin facturación) validado + juez verde + verificación fresca GO, commiteado
- **2026-09-03 06:37** `main` — payments/orders/cart/coupons/admin portados de glamify (sin combos, sin weightGr, sin MiCorreo, envío manual por ShippingZone), 116 tests verdes, bug real de comparación de CP encontrado y arreglado en revisión adversarial, gate final GO
- **2026-09-04 02:29** `main` — spec de dirección + ADR 0003 + reporte de referencias + SVG del wordmark; decisiones tomadas: "La etiqueta", sin producción todavía (5.2 contra slots), se mantiene "Carrito"/`/carrito`
- **2026-09-04 04:28** `main` — tokens de dirección de arte, motion system, Header, menú fullscreen, footer, entrada de marca, primitivas de UI/catálogo y componente de wordmark inline, sobre `97443c8`+`865a5f4`+`65cc664`. Revisión adversarial encontró un bloqueante real (foco de teclado invisible en el menú, WCAG 2.4.7) y confirmó el wordmark renderizando negro puro en vez de `ink`; ambos corregidos y verificados, con test de regresión agregado. Gate final de release: GO. Juez verde (format/lint/typecheck/test, 121 tests) y E2E verde (6/6)
