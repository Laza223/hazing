import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

// Guarda de regresión del singleton PEREZOSO de Prisma (ADR 0005, calcado de
// glamify-makeup): un solo cliente por proceso, cacheado en `globalThis`.
// Perezoso a propósito: `next build` importa los Route Handlers para
// "Collecting page data" sin ejecutarlos — si el cliente se construyera eager
// al importar el módulo, un build sin DATABASE_URL explota aunque ninguna ruta
// la use todavía (le pasó a glamify en su primer deploy a Vercel).

const DUMMY_URL = "postgresql://user:pass@localhost:5432/hazing";

describe("lib/prisma — singleton perezoso", () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });

  it("importar el módulo no explota sin DATABASE_URL (perezoso, no eager)", async () => {
    delete process.env.DATABASE_URL;
    const mod = await import("@/lib/prisma");
    expect(mod.prisma).toBeDefined();
  });

  it("expone un cliente con los delegados y métodos esperados", async () => {
    process.env.DATABASE_URL = DUMMY_URL;
    const { prisma } = await import("@/lib/prisma");
    expect(typeof prisma.$queryRawUnsafe).toBe("function");
    expect(typeof prisma.$transaction).toBe("function");
    expect(prisma.product).toBeDefined();
  });

  it("reusa la misma instancia entre imports (singleton real)", async () => {
    process.env.DATABASE_URL = DUMMY_URL;
    const first = await import("@/lib/prisma");
    // Sin vi.resetModules() acá: el módulo ya está cacheado, así que el
    // segundo import tiene que devolver el mismo objeto `prisma`.
    const second = await import("@/lib/prisma");
    expect(second.prisma).toBe(first.prisma);
  });
});

describe("lib/prisma — tope del pool (DATABASE_POOL_MAX)", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalMax = process.env.DATABASE_POOL_MAX;
  const poolConfigs: Array<{ max?: number }> = [];

  beforeEach(() => {
    vi.resetModules();
    poolConfigs.length = 0;
    delete (globalThis as { prisma?: unknown }).prisma;
    process.env.DATABASE_URL = DUMMY_URL;
    vi.doMock("@prisma/adapter-pg", async () => {
      const actual =
        await vi.importActual<typeof import("@prisma/adapter-pg")>(
          "@prisma/adapter-pg",
        );
      class SpyPrismaPg extends actual.PrismaPg {
        constructor(...args: ConstructorParameters<typeof actual.PrismaPg>) {
          poolConfigs.push(args[0] as { max?: number });
          super(...args);
        }
      }
      return { ...actual, PrismaPg: SpyPrismaPg };
    });
  });
  afterEach(() => {
    vi.doUnmock("@prisma/adapter-pg");
    delete (globalThis as { prisma?: unknown }).prisma;
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalMax === undefined) delete process.env.DATABASE_POOL_MAX;
    else process.env.DATABASE_POOL_MAX = originalMax;
  });

  it("sin la variable deja el default de pg", async () => {
    delete process.env.DATABASE_POOL_MAX;
    const { prisma } = await import("@/lib/prisma");
    void prisma.product;
    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0]?.max).toBeUndefined();
  });

  it("con DATABASE_POOL_MAX=1 limita el pool a una conexión", async () => {
    process.env.DATABASE_POOL_MAX = "1";
    const { prisma } = await import("@/lib/prisma");
    void prisma.product;
    expect(poolConfigs[0]?.max).toBe(1);
  });

  it("ignora valores inválidos", async () => {
    process.env.DATABASE_POOL_MAX = "cero";
    const { prisma } = await import("@/lib/prisma");
    void prisma.product;
    expect(poolConfigs[0]?.max).toBeUndefined();
  });
});
