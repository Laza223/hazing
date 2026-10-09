"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/customer/auth";
import { updateProfile } from "@/lib/customer/profile";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/forms/action-result";

export async function updateMarketingConsentAction(
  consent: boolean,
): Promise<ActionResult> {
  const customer = await requireCustomer();
  try {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { marketingConsent: consent === true },
    });
  } catch (err) {
    console.error("updateMarketingConsentAction falló", err);
    return {
      ok: false,
      error: "No pudimos guardar el cambio. Probá de nuevo.",
    };
  }
  revalidatePath("/cuenta/datos");
  return { ok: true };
}

export async function updateProfileAction(input: {
  name: string;
  phone: string;
}): Promise<ActionResult> {
  const customer = await requireCustomer();
  const res = await updateProfile(customer.id, input, { db: prisma as never });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/cuenta/datos");
  return { ok: true };
}
