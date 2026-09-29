"use server";

import { prisma } from "@/lib/prisma";
import { createRetractionRequest } from "@/lib/legal/retraction/service";
import type { RetractionInput } from "@/lib/legal/retraction/validation";
import type { ActionResult } from "@/lib/forms/action-result";
import { enforceRateLimit } from "@/lib/rate-limit";

export interface RetractionActionResult extends ActionResult {
  ticket?: string;
  date?: string;
}

export async function requestRetractionAction(
  input: RetractionInput,
): Promise<RetractionActionResult> {
  // Honeypot lleno: no consume cupo; el servicio lo rechaza en la validación.
  if ((input.website ?? "").trim() === "") {
    const limited = await enforceRateLimit("retraction");
    if (limited) return limited;
  }
  const r = await createRetractionRequest(input, { db: prisma });
  return r.ok
    ? { ok: true, ticket: r.ticket, date: r.date }
    : { ok: false, error: r.error };
}
