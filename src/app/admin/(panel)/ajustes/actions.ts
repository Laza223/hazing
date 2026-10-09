"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import {
  setNationwideShippingPrice,
  type NationwideZoneDb,
} from "@/lib/admin/shipping-zone";
import type { ActionResult } from "@/lib/forms/action-result";

/** Tope de los montos de Ajustes: muy por debajo del máximo de Decimal(12,2). */
const MAX_AMOUNT = 10_000_000;

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
  const pickupAddress =
    String(formData.get("pickupAddress") ?? "").trim() || null;
  if (pickupAddress && pickupAddress.length > 200) {
    return { ok: false, error: "La dirección de retiro es demasiado larga." };
  }

  if (!storeName) {
    return { ok: false, error: "El nombre de la tienda es obligatorio." };
  }

  // Vacío = sin envío gratis activo (null). Si viene algo, tiene que ser un número >= 0.
  let freeShippingThreshold: number | null = null;
  if (freeShippingThresholdRaw !== "") {
    const n = Number(freeShippingThresholdRaw);
    if (Number.isNaN(n) || n < 0 || n > MAX_AMOUNT) {
      return {
        ok: false,
        error: "El monto de envío gratis debe ser un número positivo.",
      };
    }
    freeShippingThreshold = n;
  }

  // Vacío = sin costo de envío cargado: el checkout no cotiza ni deja pagar.
  const shippingPriceRaw = String(formData.get("shippingPrice") ?? "").trim();
  let shippingPrice: number | null = null;
  if (shippingPriceRaw !== "") {
    const n = Number(shippingPriceRaw);
    if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) {
      return {
        ok: false,
        error: "El costo de envío debe ser un número positivo.",
      };
    }
    shippingPrice = n;
  }

  // Recargo fijo sobre la cotización de Correo. Vacío = 0.
  const surchargeRaw = String(formData.get("shippingSurcharge") ?? "").trim();
  const shippingSurcharge = surchargeRaw === "" ? 0 : Number(surchargeRaw);
  if (
    !Number.isFinite(shippingSurcharge) ||
    shippingSurcharge < 0 ||
    shippingSurcharge > MAX_AMOUNT
  ) {
    return {
      ok: false,
      error: "El recargo sobre el envío debe ser un número positivo.",
    };
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
        shippingSurcharge,
        originPostalCode,
        whatsappNumber,
        instagramUrl,
        tiktokUrl,
        pickupAddress,
      },
      update: {
        storeName,
        freeShippingThreshold,
        shippingSurcharge,
        originPostalCode,
        whatsappNumber,
        instagramUrl,
        tiktokUrl,
        pickupAddress,
      },
    });

    await setNationwideShippingPrice(
      shippingPrice,
      prisma as unknown as NationwideZoneDb,
    );

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
