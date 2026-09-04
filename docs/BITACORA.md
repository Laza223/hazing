# Bitácora

Una línea por cierre de sesión, escrita sola por el hook de cierre.
Solo historia — lo que se hizo, que no caduca. Lo vigente vive en `.claude/ESTADO.md`;
lo que está abierto se consulta en los PRs y el CI, no se escribe acá.

- **2026-09-03 05:34** `main` — talles decididos (ADR 0001, mixto por producto), repo+docs/spec+CLAUDE.md+config, juez verde (format/typecheck/lint/test/build) verificado con contexto fresco, commit inicial `58493c2`
- **2026-09-03 06:04** `main` — sin combos aplicado, schema Prisma completo (catálogo talle/color, envío manual, sin facturación) validado + juez verde + verificación fresca GO, commiteado
- **2026-09-03 06:37** `main` — payments/orders/cart/coupons/admin portados de glamify (sin combos, sin weightGr, sin MiCorreo, envío manual por ShippingZone), 116 tests verdes, bug real de comparación de CP encontrado y arreglado en revisión adversarial, gate final GO
- **2026-09-04 02:29** `main` — spec de dirección + ADR 0003 + reporte de referencias + SVG del wordmark; decisiones tomadas: "La etiqueta", sin producción todavía (5.2 contra slots), se mantiene "Carrito"/`/carrito`
