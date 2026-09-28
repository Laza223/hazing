"use server";

import { revalidatePath } from "next/cache";
import { getCustomer } from "@/lib/customer/auth";
import { createReview } from "@/lib/reviews/service";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/forms/action-result";

export interface ReviewActionResult extends ActionResult {
  status?: string;
}

export async function createReviewAction(
  formData: FormData,
): Promise<ReviewActionResult> {
  const website = String(formData.get("website") ?? "");
  // Bot: campo trampa completado → fingimos éxito sin crear nada.
  if (website.trim() !== "") return { ok: true, status: "pending" };

  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const authorName =
    String(formData.get("authorName") ?? "").trim() || undefined;

  const customer = await getCustomer();
  try {
    const res = await createReview(
      {
        customerId: customer?.id ?? null,
        authorName: customer
          ? (customer.name ?? customer.email)
          : (authorName ?? ""),
        productId,
        rating,
        title,
        body,
      },
      { db: prisma as never },
    );
    revalidatePath(`/producto/${slug}`);
    return { ok: true, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo enviar la reseña.",
    };
  }
}
