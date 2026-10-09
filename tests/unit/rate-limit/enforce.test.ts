import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { queryRaw, headersMock } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  headersMock: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("next/headers", () => ({ headers: headersMock }));

const { enforceRateLimit, getClientIp, RATE_LIMITS, RATE_LIMIT_ERROR } =
  await import("@/lib/rate-limit");

function withHeaders(h: Record<string, string>) {
  headersMock.mockResolvedValue(new Headers(h));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL", "1");
});
afterEach(() => vi.unstubAllEnvs());

describe("getClientIp", () => {
  it("prefiere x-vercel-forwarded-for sobre x-real-ip y x-forwarded-for", async () => {
    withHeaders({
      "x-vercel-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
      "x-forwarded-for": "3.3.3.3",
    });
    expect(await getClientIp()).toBe("1.1.1.1");
  });

  it("luego x-real-ip", async () => {
    withHeaders({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" });
    expect(await getClientIp()).toBe("2.2.2.2");
  });

  it("luego el primer valor de x-forwarded-for", async () => {
    withHeaders({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" });
    expect(await getClientIp()).toBe("3.3.3.3");
  });

  it("normaliza IPv6 a /64", async () => {
    withHeaders({ "x-vercel-forwarded-for": "2001:db8:1:2::abcd" });
    expect(await getClientIp()).toBe("2001:db8:1:2::/64");
  });

  it("sin headers de IP devuelve null", async () => {
    withHeaders({});
    expect(await getClientIp()).toBeNull();
  });

  it("fuera de Vercel (VERCEL sin setear) devuelve null aunque haya headers", async () => {
    vi.stubEnv("VERCEL", "");
    withHeaders({ "x-forwarded-for": "3.3.3.3" });
    expect(await getClientIp()).toBeNull();
    expect(headersMock).not.toHaveBeenCalled();
  });
});

describe("enforceRateLimit", () => {
  it("sin IP no limita ni toca la DB", async () => {
    withHeaders({});
    expect(await enforceRateLimit("login")).toBeNull();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("devuelve null mientras no se supera el maximo", async () => {
    withHeaders({ "x-forwarded-for": "1.1.1.1" });
    queryRaw.mockResolvedValue([
      { count: RATE_LIMITS.login.max, windowStart: new Date() },
    ]);
    expect(await enforceRateLimit("login")).toBeNull();
  });

  it("devuelve el error generico al superar el maximo", async () => {
    withHeaders({ "x-forwarded-for": "1.1.1.1" });
    queryRaw.mockResolvedValue([
      { count: RATE_LIMITS.login.max + 1, windowStart: new Date() },
    ]);
    expect(await enforceRateLimit("login")).toEqual({
      ok: false,
      error: RATE_LIMIT_ERROR,
    });
  });

  it("fuera de Vercel no limita ni toca la DB", async () => {
    vi.stubEnv("VERCEL", "");
    withHeaders({ "x-forwarded-for": "1.1.1.1" });
    expect(await enforceRateLimit("login")).toBeNull();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("politicas pedidas", () => {
    const min15 = 900_000;
    const h1 = 3_600_000;
    expect(RATE_LIMITS).toEqual({
      login: { max: 30, windowMs: min15 },
      signup: { max: 15, windowMs: h1 },
      recover: { max: 10, windowMs: h1 },
      review: { max: 10, windowMs: h1 },
      retraction: { max: 20, windowMs: h1 },
      adminLogin: { max: 10, windowMs: min15 },
      checkout: { max: 20, windowMs: h1 },
      coupon: { max: 30, windowMs: min15 },
      quote: { max: 40, windowMs: min15 },
    });
  });
});
