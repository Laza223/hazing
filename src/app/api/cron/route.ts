import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { runAbandonedCartJob } from "@/lib/cart/abandoned-job";
import { runOrderExpiryJob } from "@/lib/orders/expiry-job";

export const maxDuration = 60;

/**
 * Cron horario (carrito abandonado + autocancelación de pedidos vencidos).
 * Reemplaza el `scheduled()` del Worker de Cloudflare (ADR 0005). Lo dispara
 * Vercel Cron nativo (`vercel.json`, requiere plan Pro — Hobby limita a una
 * corrida por día). Vercel agrega solo el header
 * `Authorization: Bearer $CRON_SECRET` cuando esa env var está seteada en el
 * proyecto. Calcado de glamify-makeup.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, detail: "unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();
  // `||` y no `??`: una env var vacía ("") tiene que caer al default igual que
  // una ausente. Glamify lo sufrió en `appBaseUrl()` en su deploy a Vercel
  // (`44e65d8`); su ruta de cron todavía usa `??`, acá se aplica la misma lección.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const results = await Promise.allSettled([
    runAbandonedCartJob({ db: prisma as never, sendEmail, now, appUrl }),
    runOrderExpiryJob({ db: prisma as never, now }),
  ]);

  for (const r of results)
    if (r.status === "rejected") console.error("[cron]", r.reason);

  const [abandoned, expiry] = results;
  return NextResponse.json({
    ok: results.every((r) => r.status === "fulfilled"),
    abandoned:
      abandoned.status === "fulfilled"
        ? abandoned.value
        : { error: String(abandoned.reason) },
    expiry:
      expiry.status === "fulfilled"
        ? expiry.value
        : { error: String(expiry.reason) },
  });
}
