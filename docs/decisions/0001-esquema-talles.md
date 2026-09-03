# ADR 0001 — Esquema de talles

**Estado:** Decidida (Lazar, 2026-09-03) · **Fase que desbloquea:** 3 (schema Prisma / catálogo)

## Problema

`ProductVariant` de glamify-makeup usa tono/shade (maquillaje). Hazing vende ropa: la variante es talle + color. Hace falta definir cómo se modela el talle antes de escribir el schema, porque en ropa conviven al menos dos sistemas de numeración (letra para remeras/buzos/vestidos, numérico para pantalones) y potencialmente "talle único" (accesorios, algunas prendas).

## Alternativas descartadas

1. **Escala fija por categoría.** Cada categoría define su escala una sola vez (ej. "Pantalones" → numérico 36-48); el producto hereda la de su categoría. Descartada: menos fricción para la dueña, pero Lazar prefirió flexibilidad por producto — una categoría "Ofertas" o una subcategoría mixta rompería el supuesto de 1 categoría = 1 sistema.
2. **Enum global único (solo letras XS-XXL).** Más simple, un solo campo. Descartada: rompe apenas aparezca un pantalón con talle numérico (36-48), que es el caso más común de ropa en Argentina — hubiera exigido migración de enum + recarga de datos casi de inmediato.

## Decisión

**Mixto elegido por producto.** Cada `Product` declara su `sizeSystem` (`letters | numeric | one_size`); cada `ProductVariant` tiene `size` (string libre, validado en la capa de servicio contra la escala de su sistema) y `color` (string).

Modelo:

```prisma
enum SizeSystem {
  letters
  numeric
  one_size
}

model Product {
  // ...
  sizeSystem SizeSystem @default(letters)
}

model ProductVariant {
  // ...
  size      String
  color     String
  swatchHex String? // opcional, para el swatch de color (hereda el patrón de glamify)
}
```

Escalas fijas en código (`src/lib/catalog/sizes.ts`), no en DB:

- `letters`: `XS S M L XL XXL`
- `numeric`: `34 36 38 40 42 44 46 48 50`
- `one_size`: `Único`

Precedente propio: `ecommerce-hazing/src/constants/sizes.js` (intento anterior, mismo proyecto/dueño) ya usaba exactamente estas dos escalas — se reutilizan tal cual, no se inventan de cero.

Validación: `isValidSize(system, size)` en `src/lib/admin/products/validation.ts` — el talle de cada variante debe pertenecer a la escala del `sizeSystem` del producto. Par `(size, color)` único por producto (reemplaza el chequeo de nombres de variante duplicados que usa glamify).

`ProductVariant.name` se conserva (lo consumen carrito, snapshots de `OrderItem` y emails transaccionales) y se deriva en el servicio como `"{size} · {color}"` — no es un campo que carga la dueña a mano.

Admin (Fase 7): select "Sistema de talles" a nivel producto; cada fila de variante muestra un select de talle filtrado por ese sistema + un campo de color.

## Reversibilidad

Barata ahora (sin datos cargados todavía). Después de cargar catálogo real, cambiar de sistema es una migración de enum + revalidación de datos existentes — moderada, no trivial. Agregar una escala nueva (ej. tallas de calzado) no requiere migración: es un cambio de código en `SIZE_SCALES`.

## Consecuencias aceptadas

- Escalas nuevas o ajustes a una escala existente son cambio de código (deploy), no algo que la dueña edite desde el admin. Aceptado: las escalas argentinas de ropa son estables, no cambian por temporada.
- La validación de talle vive en la capa de servicio, no en un `CHECK` de Postgres — un insert directo a la DB (fuera del admin) podría cargar un talle inválido. Aceptado: no hay acceso directo a DB planeado fuera de scripts propios.
