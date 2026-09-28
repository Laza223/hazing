"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/forms/action-result";

export async function updateSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const storeName = String(formData.get("storeName") ?? "").trim();
  const freeShippingThresholdRaw = String(
    formData.get("freeShippingThreshold") ?? "",
  ).trim();
  const originPostalCode = String(
    formData.get("originPostalCode") ?? "",
  ).trim();
  const whatsappNumber =
    String(formData.get("whatsappNumber") ?? "").trim() || null;
  const instagramUrl =
    String(formData.get("instagramUrl") ?? "").trim() || null;
  const tiktokUrl = String(formData.get("tiktokUrl") ?? "").trim() || null;

  if (!storeName) {
    return { ok: false, error: "El nombre de la tienda es obligatorio." };
  }

  // Vacío = sin envío gratis activo (null). Si viene algo, tiene que ser un número >= 0.
  let freeShippingThreshold: number | null = null;
  if (freeShippingThresholdRaw !== "") {
    const n = Number(freeShippingThresholdRaw);
    if (Number.isNaN(n) || n < 0) {
      return {
        ok: false,
        error: "El monto de envío gratis debe ser un número positivo.",
      };
    }
    freeShippingThreshold = n;
  }

  if (!originPostalCode || originPostalCode.length < 4) {
    return {
      ok: false,
      error:
        "El código postal de origen debe tener al menos 4 caracteres (ej. 6700).",
    };
  }

  try {
    await prisma.setting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        storeName,
        freeShippingThreshold,
        originPostalCode,
        whatsappNumber,
        instagramUrl,
        tiktokUrl,
      },
      update: {
        storeName,
        freeShippingThreshold,
        originPostalCode,
        whatsappNumber,
        instagramUrl,
        tiktokUrl,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin/ajustes");

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al guardar los ajustes.",
    };
  }
}
