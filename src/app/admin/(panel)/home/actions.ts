"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminResult } from "@/lib/admin/result";
import { validateHomeContent } from "@/lib/admin/home/validation";
import {
  defaultHomeContentDeps,
  saveHomeContent,
} from "@/lib/admin/home/service";
import { uploadProductImage } from "@/lib/admin/products/images";
import type { HomeContentData } from "@/lib/home/content";

export async function saveHomeContentAction(
  input: HomeContentData,
): Promise<AdminResult> {
  try {
    await requireAdmin();
    const v = validateHomeContent(input);
    if (!v.ok) return { ok: false, error: v.error };
    await saveHomeContent(v.value, defaultHomeContentDeps());
    revalidatePath("/");
    revalidatePath("/admin/home");
    return { ok: true };
  } catch (e) {
    console.error("saveHomeContentAction", e);
    return {
      ok: false,
      error: "No se pudo guardar. Probá de nuevo y, si sigue, avisale a Lazar.",
    };
  }
}

export interface UploadHomeImageResult extends AdminResult {
  path?: string;
}

export async function uploadHomeImageAction(
  formData: FormData,
): Promise<UploadHomeImageResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0)
      return { ok: false, error: "Elegí una imagen para subir." };
    const { path } = await uploadProductImage(file, "home");
    return { ok: true, path };
  } catch (e) {
    console.error("uploadHomeImageAction", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo subir la imagen.",
    };
  }
}
