import type { SizeSystem } from "@prisma/client";
import { slugify } from "@/lib/admin/slug";
import { isValidSku } from "@/lib/sku";
import { isValidSize } from "@/lib/catalog/sizes";

export type Validated<T> =
  { ok: true; value: T } | { ok: false; error: string };

export interface VariantFormInput {
  /** Id de la fila existente en DB — ausente si es una variante nueva (todavía sin crear). */
  id?: string;
  size: string;
  color: string;
  swatchHex: string | null;
  sku: string;
  stock: number | "";
  /** Stock que tenía la fila al cargar el form (solo variantes existentes). El servicio aplica
   *  la diferencia `stock - baseStock` con increment, para no pisar ventas hechas mientras se editaba. */
  baseStock?: number;
  lowStockThreshold: number | "";
  priceOverride: number | null;
  image: string | null;
  active: boolean;
  order: number;
}

export interface ProductFormInput {
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  /** Categorías adicionales (además de la primaria `categoryId`) — sin duplicar el producto. */
  extraCategoryIds: string[];
  /** Ver docs/decisions/0001-esquema-talles.md — decide contra qué escala se valida `size`. */
  sizeSystem: SizeSystem;
  basePrice: number | "";
  compareAtPrice: number | null;
  cost: number | "";
  images: string[];
  isFeatured: boolean;
  heroRank: number | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  active: boolean;
  variants: VariantFormInput[];
}

export interface VariantClean {
  id?: string;
  size: string;
  color: string;
  swatchHex: string | null;
  sku: string;
  stock: number;
  baseStock?: number;
  lowStockThreshold: number;
  priceOverride: number | null;
  image: string | null;
  active: boolean;
  order: number;
}

export interface ProductClean {
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  extraCategoryIds: string[];
  sizeSystem: SizeSystem;
  basePrice: number;
  compareAtPrice: number | null;
  cost: number;
  images: string[];
  isFeatured: boolean;
  heroRank: number | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  active: boolean;
  variants: VariantClean[];
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isPositiveInt(n: number | ""): boolean {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}
function isNonNegativeInt(n: number | ""): boolean {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

/** Valida una variante contra la escala de talles del `sizeSystem` del producto (ADR 0001). */
export function validateVariant(
  input: VariantFormInput,
  sizeSystem: SizeSystem,
): Validated<VariantClean> {
  const size = input.size.trim();
  if (!size) return { ok: false, error: "Elegí un talle para la variante." };
  if (!isValidSize(sizeSystem, size)) {
    return {
      ok: false,
      error: `El talle "${size}" no pertenece al sistema de talles elegido.`,
    };
  }

  const color = input.color.trim();
  if (!color)
    return {
      ok: false,
      error: "El color de la variante no puede estar vacío.",
    };

  let swatchHex: string | null = null;
  if (input.swatchHex != null && input.swatchHex.trim() !== "") {
    const hex = input.swatchHex.trim();
    if (!HEX_RE.test(hex))
      return {
        ok: false,
        error: "El color del swatch debe ser un hex tipo #171717.",
      };
    swatchHex = hex.toUpperCase();
  }

  // Una fila existente puede tener stock negativo (oversell registrado): se acepta ese valor
  // al re-guardar. Las variantes nuevas siguen exigiendo >= 0.
  const stockOk =
    input.id != null
      ? typeof input.stock === "number" && Number.isInteger(input.stock)
      : isNonNegativeInt(input.stock);
  if (!stockOk)
    return {
      ok: false,
      error:
        input.id != null
          ? "El stock debe ser un número entero."
          : "El stock debe ser un número entero mayor o igual a 0.",
    };
  if (input.baseStock != null && !Number.isInteger(input.baseStock))
    return { ok: false, error: "El stock original no es válido." };
  if (!isNonNegativeInt(input.lowStockThreshold))
    return {
      ok: false,
      error: "El aviso de bajo stock debe ser un entero mayor o igual a 0.",
    };

  let priceOverride: number | null = null;
  if (input.priceOverride != null) {
    if (!(input.priceOverride > 0))
      return {
        ok: false,
        error: "El precio especial de la variante debe ser mayor a 0.",
      };
    priceOverride = input.priceOverride;
  }

  let sku = "";
  if (input.sku.trim() !== "") {
    sku = input.sku.trim().toUpperCase();
    if (!isValidSku(sku))
      return {
        ok: false,
        error: `El SKU "${input.sku}" no tiene un formato válido (ej. REM-0007).`,
      };
  }

  const image =
    input.image != null && input.image.trim() !== ""
      ? input.image.trim()
      : null;

  return {
    ok: true,
    value: {
      id: input.id,
      size,
      color,
      swatchHex,
      sku,
      stock: typeof input.stock === "number" ? input.stock : 0,
      baseStock: input.baseStock,
      lowStockThreshold:
        typeof input.lowStockThreshold === "number"
          ? input.lowStockThreshold
          : 0,
      priceOverride,
      image,
      active: input.active,
      order: Number.isInteger(input.order) ? input.order : 0,
    },
  };
}

export function validateProduct(
  input: ProductFormInput,
): Validated<ProductClean> {
  const name = input.name.trim();
  if (!name)
    return { ok: false, error: "El nombre del producto no puede estar vacío." };

  const slug = slugify(input.slug.trim() !== "" ? input.slug : name);
  if (!slug)
    return {
      ok: false,
      error: "No se pudo generar un enlace (slug) válido a partir del nombre.",
    };

  if (!input.categoryId.trim())
    return { ok: false, error: "Elegí una categoría para el producto." };
  const categoryId = input.categoryId.trim();

  // Dedupe y excluye la primaria: nunca debe quedar duplicada entre primaria y adicionales.
  const extraCategoryIds = Array.from(
    new Set(
      input.extraCategoryIds.map((id) => id.trim()).filter((id) => id !== ""),
    ),
  ).filter((id) => id !== categoryId);

  if (typeof input.basePrice !== "number" || !(input.basePrice > 0))
    return { ok: false, error: "El precio debe ser mayor a 0." };
  if (typeof input.cost !== "number")
    return {
      ok: false,
      error:
        "Cargá el costo (lo que te salió la prenda). Si no lo sabés, poné 0.",
    };
  if (input.cost < 0)
    return { ok: false, error: "El costo no puede ser negativo." };

  let compareAtPrice: number | null = null;
  if (input.compareAtPrice != null) {
    if (!(input.compareAtPrice > input.basePrice)) {
      return {
        ok: false,
        error:
          "El precio anterior (oferta) tiene que ser mayor al precio actual.",
      };
    }
    compareAtPrice = input.compareAtPrice;
  }

  let heroRank: number | null = null;
  if (input.heroRank != null) {
    if (!isPositiveInt(input.heroRank))
      return {
        ok: false,
        error: "El orden en portada debe ser un entero mayor a 0.",
      };
    heroRank = input.heroRank;
  }

  const tags = Array.from(
    new Set(
      input.tags.map((t) => t.trim().toLowerCase()).filter((t) => t !== ""),
    ),
  );
  const images = input.images.map((i) => i.trim()).filter((i) => i !== "");

  if (input.variants.length === 0) {
    return {
      ok: false,
      error: "Agregá al menos una variante (talle y color).",
    };
  }

  const cleanVariants: VariantClean[] = [];
  for (const v of input.variants) {
    const r = validateVariant(v, input.sizeSystem);
    if (!r.ok) return { ok: false, error: r.error };
    cleanVariants.push(r.value);
  }

  // Reemplaza el chequeo de nombres duplicados de glamify: acá la unicidad es por
  // par (talle, color) — ver ADR 0001.
  const pairs = cleanVariants.map((v) => `${v.size}::${v.color.toLowerCase()}`);
  if (new Set(pairs).size !== pairs.length) {
    return {
      ok: false,
      error:
        "Hay variantes repetidas: cada combinación de talle y color debe ser única.",
    };
  }

  const manualSkus = cleanVariants.map((v) => v.sku).filter((s) => s !== "");
  if (new Set(manualSkus).size !== manualSkus.length) {
    return {
      ok: false,
      error: "Hay variantes con el mismo SKU. Cada SKU debe ser único.",
    };
  }

  return {
    ok: true,
    value: {
      name,
      slug,
      description:
        input.description != null && input.description.trim() !== ""
          ? input.description.trim()
          : null,
      categoryId,
      extraCategoryIds,
      sizeSystem: input.sizeSystem,
      basePrice: typeof input.basePrice === "number" ? input.basePrice : 0,
      compareAtPrice,
      cost: typeof input.cost === "number" ? input.cost : 0,
      images,
      isFeatured: input.isFeatured,
      heroRank,
      tags,
      seoTitle:
        input.seoTitle != null && input.seoTitle.trim() !== ""
          ? input.seoTitle.trim()
          : null,
      seoDescription:
        input.seoDescription != null && input.seoDescription.trim() !== ""
          ? input.seoDescription.trim()
          : null,
      active: input.active,
      variants: cleanVariants,
    },
  };
}
