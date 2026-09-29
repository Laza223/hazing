import { describe, it, expect, vi, afterEach } from "vitest";

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { checkRateLimit } = await import("@/lib/rate-limit");
type Deps = NonNullable<Parameters<typeof checkRateLimit>[1]>;

const WINDOW = 15 * 60 * 1000;
const input = { action: "login", ip: "1.2.3.4", max: 3, windowMs: WINDOW };

/** Simula el upsert atomico: misma semantica que el SQL, en memoria. */
function fakeDb(start: Date) {
  let clock = start;
  const store = new Map<string, { count: number; windowStart: Date }>();
  const deps: Deps = {
    now: () => clock,
    query: async ({ key, now, cutoff }) => {
      const row = store.get(key);
      const next =
        !row || row.windowStart < cutoff
          ? { count: 1, windowStart: now }
          : { count: row.count + 1, windowStart: row.windowStart };
      store.set(key, next);
      return [next];
    },
  };
  return {
    deps,
    store,
    advance: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("checkRateLimit", () => {
  it("permite hasta max y bloquea el max+1", async () => {
    const { deps } = fakeDb(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 3; i++)
      expect(await checkRateLimit(input, deps)).toEqual({
        allowed: true,
        retryAfterSec: 0,
      });
    expect((await checkRateLimit(input, deps)).allowed).toBe(false);
  });

  it("retryAfterSec es el tiempo restante de la ventana", async () => {
    const { deps, advance } = fakeDb(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 3; i++) await checkRateLimit(input, deps);
    advance(5 * 60 * 1000);
    const r = await checkRateLimit(input, deps);
    expect(r).toEqual({ allowed: false, retryAfterSec: 10 * 60 });
  });

  it("ventana vencida reinicia el contador", async () => {
    const { deps, advance } = fakeDb(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 4; i++) await checkRateLimit(input, deps);
    expect((await checkRateLimit(input, deps)).allowed).toBe(false);
    advance(WINDOW + 1);
    expect((await checkRateLimit(input, deps)).allowed).toBe(true);
  });

  it("cuenta por separado por accion e IP", async () => {
    const { deps, store } = fakeDb(new Date("2026-01-01T00:00:00Z"));
    await checkRateLimit(input, deps);
    await checkRateLimit({ ...input, ip: "9.9.9.9" }, deps);
    await checkRateLimit({ ...input, action: "signup" }, deps);
    expect([...store.keys()].sort()).toEqual([
      "login:1.2.3.4",
      "login:9.9.9.9",
      "signup:1.2.3.4",
    ]);
  });

  it("fail-open: si la consulta falla loguea y permite", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps: Deps = {
      now: () => new Date(),
      query: async () => {
        throw new Error("db caida");
      },
    };
    expect(await checkRateLimit(input, deps)).toEqual({
      allowed: true,
      retryAfterSec: 0,
    });
    expect(err).toHaveBeenCalledOnce();
  });

  it("timeout de 1500 ms: loguea y permite (fail-open)", async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps: Deps = {
      now: () => new Date(),
      query: () => new Promise(() => {}),
    };
    const pending = checkRateLimit(input, deps);
    await vi.advanceTimersByTimeAsync(1499);
    expect(err).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({
      allowed: true,
      retryAfterSec: 0,
    });
    expect(err).toHaveBeenCalledOnce();
  });

  it("el SQL por defecto es un upsert atomico ON CONFLICT sobre la clave", async () => {
    queryRaw.mockResolvedValue([{ count: 1, windowStart: new Date() }]);
    await checkRateLimit(input);
    const strings = (queryRaw.mock.calls[0][0] as readonly string[]).join("?");
    expect(strings).toContain('INSERT INTO "RateLimit"');
    expect(strings).toContain('ON CONFLICT ("key") DO UPDATE');
    expect(strings).toContain("RETURNING");
    expect(queryRaw.mock.calls[0][1]).toBe("login:1.2.3.4");
  });
});
