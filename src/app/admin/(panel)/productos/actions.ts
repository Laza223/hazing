"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import type { AdminResult } from "@/lib/admin/result";
import {
  validateProduct,
  type ProductFormInput,
} from "@/lib/admin/products/validation";
import {
  createProduct,
  updateProduct,
  softDeleteProduct,
  defaultProductDeps,
} from "@/lib/admin/products/service";
import { uploadProductImage } from "@/lib/admin/products/images";
import {
  previewPriceIncrease,
  applyPriceIncrease,
} from "@/lib/admin/products/bulk-price";

/** El producto puede afectar la home, el listado de tienda y su propia PDP. */
function revalidateStorefront(slug?: string) {
  revalidatePath("/");
  revalidatePath("/tienda");
  if (slug) revalidatePath(`/producto/${slug}`);
}

export async function createProductAction(
  input: ProductFormInput,
): Promise<AdminResult> {
  try {
    await requireAdmin();
    const v = validateProduct(input);
    if (!v.ok) return { ok: false, error: v.error };
    const { id } = await createProduct(v.value, defaultProductDeps());
    revalidatePath("/admin/productos");
    revalidateStorefront(v.value.slug);
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo crear el producto.",
    };
  }
}

export async function updateProductAction(
  id: string,
  input: ProductFormInput,
): Promise<AdminResult> {
  try {
    await requireAdmin();
    const v = validateProduct(input);
    if (!v.ok) return { ok: false, error: v.error };
    const res = await updateProduct(id, v.value, defaultProductDeps());
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${id}`);
    revalidateStorefront(v.value.slug);
    return { ok: true, id: res.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el producto.",
    };
  }
}

export async function deleteProductAction(id: string): Promise<AdminResult> {
  try {
    await requireAdmin();
    const product = await prisma.product.findUnique({
      where: { id },
      select: { slug: true },
    });
    await softDeleteProduct(id, defaultProductDeps());
    revalidatePath("/admin/productos");
    revalidateStorefront(product?.slug);
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo dar de baja el producto.",
    };
  }
}

export interface PriceIncreasePreviewResult extends AdminResult {
  products?: number;
  example?: { from: number; to: number } | null;
}

export async function previewPriceIncreaseAction(
  percent: number,
  categoryId: string | null,
): Promise<PriceIncreasePreviewResult> {
  await requireAdmin();
  try {
    const p = await previewPriceIncrease({ percent, categoryId });
    return { ok: true, products: p.products, example: p.example };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo calcular la suba.",
    };
  }
}

export async function applyPriceIncreaseAction(
  percent: number,
  categoryId: string | null,
): Promise<PriceIncreasePreviewResult> {
  await requireAdmin();
  try {
    const r = await applyPriceIncrease({ percent, categoryId });
    revalidatePath("/admin/productos");
    revalidatePath("/");
    revalidatePath("/tienda");
    revalidatePath("/producto/[slug]", "page");
    return { ok: true, products: r.products };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo subir los precios.",
    };
  }
}

export interface UploadImageResult extends AdminResult {
  path?: string;
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<UploadImageResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0)
      return { ok: false, error: "Elegí una imagen para subir." };
    const { path } = await uploadProductImage(file);
    return { ok: true, path };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo subir la imagen.",
    };
  }
}
