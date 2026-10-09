import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/forms/action-result";

/**
 * Políticas por acción pública. Ventana fija por (acción, IP). Los topes son
 * holgados a propósito: en Argentina muchas clientas comparten IP (datos móviles).
 */
export const RATE_LIMITS = {
  login: { max: 30, windowMs: 15 * 60 * 1000 },
  signup: { max: 15, windowMs: 60 * 60 * 1000 },
  recover: { max: 10, windowMs: 60 * 60 * 1000 },
  review: { max: 10, windowMs: 60 * 60 * 1000 },
  retraction: { max: 20, windowMs: 60 * 60 * 1000 }, // derecho legal: generoso
  adminLogin: { max: 10, windowMs: 15 * 60 * 1000 },
  checkout: { max: 20, windowMs: 60 * 60 * 1000 },
  coupon: { max: 30, windowMs: 15 * 60 * 1000 },
  // Cada cotización pega a la API de MiCorreo con la cuenta de la tienda.
  quote: { max: 40, windowMs: 15 * 60 * 1000 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export const RATE_LIMIT_ERROR =
  "Demasiados intentos. Probá de nuevo en unos minutos.";

/** Si la consulta tarda más que esto se asume DB caída y se permite (fail-open). */
export const RATE_LIMIT_TIMEOUT_MS = 1500;

export interface RateLimitRow {
  count: number;
  windowStart: Date;
}

export interface RateLimitDeps {
  now: () => Date;
  /** Ejecuta el upsert atómico y devuelve la fila resultante. */
  query: (p: {
    key: string;
    now: Date;
    cutoff: Date;
  }) => Promise<RateLimitRow[]>;
}

/**
 * Una sola sentencia: inserta el contador o, si la clave existe, lo incrementa
 * (o lo reinicia si la ventana venció). Atómico bajo concurrencia por el
 * ON CONFLICT — no partir en SELECT + UPDATE.
 */
async function upsertRateLimitRow(p: {
  key: string;
  now: Date;
  cutoff: Date;
}): Promise<RateLimitRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{ count: number | bigint; windowStart: Date }>
  >`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${p.key}, 1, ${p.now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" < ${p.cutoff} THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" < ${p.cutoff} THEN ${p.now}
        ELSE "RateLimit"."windowStart"
      END
    RETURNING "count", "windowStart"
  `;
  return rows.map((r) => ({
    count: Number(r.count),
    windowStart: r.windowStart,
  }));
}

const defaultDeps: RateLimitDeps = {
  now: () => new Date(),
  query: upsertRateLimitRow,
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout de ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function checkRateLimit(
  input: { action: string; ip: string; max: number; windowMs: number },
  deps: RateLimitDeps = defaultDeps,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  try {
    const now = deps.now();
    const cutoff = new Date(now.getTime() - input.windowMs);
    const [row] = await withTimeout(
      deps.query({ key: `${input.action}:${input.ip}`, now, cutoff }),
      RATE_LIMIT_TIMEOUT_MS,
    );
    if (!row) throw new Error("upsert sin fila de retorno");
    if (row.count <= input.max) return { allowed: true, retryAfterSec: 0 };
    const resetAt = row.windowStart.getTime() + input.windowMs;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
    };
  } catch (e) {
    // Fail-open: un rate limit caído (o lento) no puede dejar sin login a todas.
    console.error("[rate-limit]", e);
    return { allowed: true, retryAfterSec: 0 };
  }
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isIpv4(s: string): boolean {
  const m = IPV4.exec(s);
  return !!m && m.slice(1).every((o) => Number(o) <= 255);
}

/** Expande una IPv6 a 8 hextetos (números); `null` si no es válida. */
function expandIpv6(raw: string): number[] | null {
  let s = raw;
  // Cola IPv4 embebida (::ffff:1.2.3.4) → dos hextetos.
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    if (!isIpv4(tail)) return null;
    const o = tail.split(".").map(Number);
    s = `${s.slice(0, lastColon + 1)}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string): string[] => (part ? part.split(":") : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...rest];
  const nums = groups.map((g) =>
    /^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN,
  );
  return nums.some(Number.isNaN) ? null : nums;
}

/**
 * Clave de cliente: IPv4 tal cual; IPv6 → prefijo /64 (una clienta controla el
 * /64 entero, rotar dentro de él no debe evadir el límite); IPv4 mapeada
 * (::ffff:a.b.c.d) → la IPv4. `null` si no es una IP válida.
 */
export function normalizeIp(raw: string): string | null {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/%.*$/, "");
  if (isIpv4(s)) return s;
  const g = expandIpv6(s);
  if (!g) return null;
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  }
  return `${g
    .slice(0, 4)
    .map((n) => n.toString(16))
    .join(":")}::/64`;
}

/**
 * IP del cliente normalizada, o `null` (no se limita) si no hay IP confiable.
 * Solo en Vercel (`VERCEL` seteada): en dev local y E2E no se escribe ni se
 * bloquea nada. En Vercel el borde sobreescribe los headers de reenvío.
 */
export async function getClientIp(): Promise<string | null> {
  if (!process.env.VERCEL) return null;
  const h = await headers();
  const raw =
    h.get("x-vercel-forwarded-for") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0];
  return raw ? normalizeIp(raw) : null;
}

/** `null` si puede seguir; si no, el resultado de error para devolver desde la acción. */
export async function enforceRateLimit(
  action: RateLimitAction,
): Promise<ActionResult | null> {
  const ip = await getClientIp();
  if (!ip) return null;
  const { allowed } = await checkRateLimit({
    action,
    ip,
    ...RATE_LIMITS[action],
  });
  return allowed ? null : { ok: false, error: RATE_LIMIT_ERROR };
}
