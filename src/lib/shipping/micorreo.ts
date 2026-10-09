import "server-only";

/**
 * Cotización en vivo contra la API oficial de MiCorreo (Correo Argentino), portada de
 * glamify-makeup (solo cotización: sin importación de envíos, sucursales ni tracking —
 * el despacho es manual, ADR 0004).
 *
 *   1. POST /token          Basic <gateway> + {email,password}  → { token, expire }
 *   2. POST /users/validate Bearer <token>  + {email,password}  → { customerId }
 *   3. POST /rates          Bearer <token>  + {customerId, CPs, deliveredType, dimensions}
 *                                                               → { rates: [{ productType, price }] }
 *
 * `productType`: CP = Clásico, EP = Expreso. `deliveredType`: S = sucursal, D = domicilio.
 * `dimensions.weight` en GRAMOS enteros; largo/ancho/alto en CM.
 *
 * Cae a null ante cualquier problema: el orquestador usa el precio de respaldo y el
 * checkout nunca se rompe por Correo.
 */
import type { LiveQuote } from "@/lib/shipping/quote";

const API_BASE_PROD = "https://api.correoargentino.com.ar/micorreo/v1";
const API_BASE_TEST = "https://apitest.correoargentino.com.ar/micorreo/v1";
const TIMEOUT_MS = 6000;
const ORIGIN_CP_DEFAULT = "6700"; // Luján

/** Peso estimado por unidad del carrito (g) y mínimo por pedido. */
export const UNIT_WEIGHT_GR = 400;
export const MIN_WEIGHT_GR = 500;
/** Un solo paquete por pedido (cm). */
export const PACKAGE_CM = { length: 25, width: 20, height: 5 } as const;

/** Peso del pedido en gramos a partir de la cantidad total de unidades. */
export function orderWeightGr(units: number): number {
  return Math.max(MIN_WEIGHT_GR, units * UNIT_WEIGHT_GR);
}

const DELIVERED_BY_METHOD = { domicilio: "D", sucursal: "S" } as const;
const PRODUCT_BY_VELOCITY = { classic: "CP", express: "EP" } as const;

export type MicorreoEnv = {
  MICORREO_EMAIL?: string;
  MICORREO_PASSWORD?: string;
  /** Token de gateway (parte base64 de "Basic ..."); el código antepone "Basic ". */
  MICORREO_GATEWAY_AUTH?: string;
  /** "1" para pegar contra apitest en vez de producción. */
  MICORREO_SANDBOX?: string;
  /** CP de origen; default 6700 (Luján). */
  MICORREO_ORIGIN_CP?: string;
  /** "classic" (default) o "express". */
  MICORREO_VELOCITY?: string;
};

export function isMicorreoConfigured(
  env: MicorreoEnv = process.env as MicorreoEnv,
): boolean {
  return Boolean(
    env.MICORREO_EMAIL && env.MICORREO_PASSWORD && env.MICORREO_GATEWAY_AUTH,
  );
}

export interface MicorreoQuoteInput {
  cpDestino: string;
  pesoGr: number;
  metodo: "domicilio" | "sucursal";
}

export interface MicorreoRatesResponse {
  rates?: Array<{
    productType?: string;
    price?: number;
  } | null>;
}

/** Elige la tarifa del `productType` pedido. Pura: se testea sin red. */
export function pickRate(
  res: MicorreoRatesResponse,
  productType: "CP" | "EP",
): LiveQuote | null {
  const rate = res.rates?.find((r) => r?.productType === productType);
  if (!rate) return null;
  const cost = rate.price;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost <= 0)
    return null;
  return { cost, carrier: "Correo Argentino" };
}

function apiBase(env: MicorreoEnv): string {
  return env.MICORREO_SANDBOX === "1" ? API_BASE_TEST : API_BASE_PROD;
}

// Cache de token + customerId por proceso: evita 2 round-trips extra por cotización.
interface AuthCache {
  token: string;
  customerId: string;
  expiresAt: number;
}
let authCache: AuthCache | null = null;
/** Auth en vuelo: varias cotizaciones simultáneas comparten un solo /token + /users/validate. */
let authInFlight: Promise<{ token: string; customerId: string } | null> | null =
  null;

/** Resetea el cache de auth (para tests). */
export function __resetMicorreoAuthCache(): void {
  authCache = null;
  authInFlight = null;
}

/** Sin secretos: solo el paso y el status HTTP, para enterarse si la cotización cae al respaldo. */
function logFailure(step: string, detail: string | number): void {
  console.error(
    `[micorreo] ${step} falló (${detail}); se usa el precio de respaldo`,
  );
}

async function getAuth(
  env: MicorreoEnv,
  fetchImpl: typeof fetch,
  now: number,
): Promise<{ token: string; customerId: string } | null> {
  if (authCache && authCache.expiresAt > now) {
    return { token: authCache.token, customerId: authCache.customerId };
  }
  if (!authInFlight) {
    authInFlight = fetchAuth(env, fetchImpl, now).finally(() => {
      authInFlight = null;
    });
  }
  return authInFlight;
}

async function fetchAuth(
  env: MicorreoEnv,
  fetchImpl: typeof fetch,
  now: number,
): Promise<{ token: string; customerId: string } | null> {
  const base = apiBase(env);
  const creds = { email: env.MICORREO_EMAIL, password: env.MICORREO_PASSWORD };

  const tokenRes = await fetchImpl(`${base}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${env.MICORREO_GATEWAY_AUTH}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(creds),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!tokenRes.ok) {
    logFailure("/token", tokenRes.status);
    return null;
  }
  const tokenJson = (await tokenRes.json()) as {
    token?: string;
    expire?: string;
  };
  const token = tokenJson.token;
  if (!token) return null;

  const validateRes = await fetchImpl(`${base}/users/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(creds),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!validateRes.ok) {
    logFailure("/users/validate", validateRes.status);
    return null;
  }
  const validateJson = (await validateRes.json()) as {
    customerId?: string | number;
  };
  const customerId = validateJson.customerId;
  if (customerId === undefined || customerId === null || customerId === "")
    return null;

  // Cache hasta 60s antes de la expiración informada; si no parsea, 10 min.
  const expMs = tokenJson.expire ? Date.parse(tokenJson.expire) : NaN;
  const expiresAt = Number.isFinite(expMs) ? expMs - 60_000 : now + 10 * 60_000;
  authCache = { token, customerId: String(customerId), expiresAt };
  return { token, customerId: String(customerId) };
}

/**
 * Cotiza un envío. Devuelve null ante cualquier problema (sin credenciales,
 * timeout, error HTTP, tarifa ausente). `nowMs` es inyectable solo para tests.
 */
export async function quoteMicorreo(
  input: MicorreoQuoteInput,
  env: MicorreoEnv = process.env as MicorreoEnv,
  fetchImpl: typeof fetch = fetch,
  nowMs: number = Date.now(),
): Promise<LiveQuote | null> {
  if (!isMicorreoConfigured(env)) return null;
  if (!input.cpDestino?.trim()) return null;

  try {
    const auth = await getAuth(env, fetchImpl, nowMs);
    if (!auth) return null;

    const productType =
      PRODUCT_BY_VELOCITY[
        env.MICORREO_VELOCITY === "express" ? "express" : "classic"
      ];
    const body = {
      customerId: auth.customerId,
      postalCodeOrigin: (env.MICORREO_ORIGIN_CP || ORIGIN_CP_DEFAULT).trim(),
      postalCodeDestination: input.cpDestino.trim(),
      deliveredType: DELIVERED_BY_METHOD[input.metodo],
      dimensions: {
        // La API exige el peso en GRAMOS enteros.
        weight: Math.max(1, Math.round(input.pesoGr)),
        ...PACKAGE_CM,
      },
    };

    const res = await fetchImpl(`${apiBase(env)}/rates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Token vencido o revocado antes de lo informado: la próxima cotización pide uno nuevo.
      if (res.status === 401) authCache = null;
      logFailure("/rates", res.status);
      return null;
    }
    return pickRate((await res.json()) as MicorreoRatesResponse, productType);
  } catch (e) {
    logFailure("cotización", e instanceof Error ? e.name : "error");
    return null;
  }
}
