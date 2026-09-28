"use server";

import { revalidatePath } from "next/cache";
import type { RetractionStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/forms/action-result";

export async function updateRetractionStatusAction(input: {
  id: string;
  status: RetractionStatus;
}): Promise<ActionResult> {
  await requireAdmin();

  try {
    await prisma.retractionRequest.update({
      where: { id: input.id },
      data: { status: input.status },
    });

    revalidatePath("/admin/arrepentimiento");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado de la solicitud.",
    };
  }
}
