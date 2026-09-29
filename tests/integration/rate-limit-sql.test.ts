import { describe, it, expect, afterAll, vi } from "vitest";

// Opcional: corre el SQL REAL de checkRateLimit contra Postgres. Solo si se
// define RATE_LIMIT_TEST_DB_URL (una base con la tabla "RateLimit" migrada).
// Escribe filas con prefijo "it-<random>:" y las borra al terminar.
// Ejemplo: RATE_LIMIT_TEST_DB_URL=postgresql://... pnpm exec vitest run tests/integration/rate-limit-sql.test.ts

const url = process.env.RATE_LIMIT_TEST_DB_URL;

const { client } = vi.hoisted(() => ({
  client: { current: null as unknown as import("@prisma/client").PrismaClient },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy(
    {},
    { get: (_t, prop) => Reflect.get(client.current, prop) },
  ),
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

describe.skipIf(!url)("checkRateLimit contra Postgres real", () => {
  const prefix = `it-${Math.random().toString(36).slice(2, 10)}`;

  afterAll(async () => {
    await client.current?.rateLimit.deleteMany({
      where: { key: { startsWith: prefix } },
    });
    await client.current?.$disconnect();
  });

  it("cuenta hasta max, bloquea el siguiente y es atomico bajo concurrencia", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    client.current = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url!, max: 5 }),
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const input = { action: prefix, ip: "1.2.3.4", max: 5, windowMs: 60_000 };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => checkRateLimit(input)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect(results.filter((r) => !r.allowed)).toHaveLength(3);

    const row = await client.current.rateLimit.findUnique({
      where: { key: `${prefix}:1.2.3.4` },
    });
    expect(row?.count).toBe(8);
  });
});
