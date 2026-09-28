"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminResult } from "@/lib/admin/result";
import {
  changeOrderStatus,
  defaultOrdersDeps,
} from "@/lib/admin/orders/service";
import type { OrderStatus } from "@prisma/client";

export async function changeOrderStatusAction(
  orderId: string,
  to: OrderStatus,
): Promise<AdminResult> {
  try {
    await requireAdmin();
    const r = await changeOrderStatus(orderId, to, defaultOrdersDeps());
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    return { ok: true, id: r.id };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo cambiar el estado del pedido.",
    };
  }
}
