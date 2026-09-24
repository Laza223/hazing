import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export type PrismaTransactionClient = Prisma.TransactionClient;

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON PEREZOSO DE MÓDULO (Vercel / Node serverless) — ver ADR 0005
// ────────────────────────────────────────────────────────────────────────────
// Antes era un cliente por-request (cache() + Proxy) porque en Cloudflare
// Workers un socket TCP pertenece al request que lo abrió. En Vercel (funciones
// Node / Fluid Compute) esa restricción no existe: una instancia tibia se reusa
// de forma segura entre invocaciones, y `pg.Pool` está hecho para eso.
// Calcado de glamify-makeup (b25d196), que hizo la misma migración.
//
// OJO: el singleton tiene que ser PEREZOSO, no eager al importar el módulo.
// `next build` importa los Route Handlers para "Collecting page data" sin
// ejecutarlos; si el cliente se construye al importar y DATABASE_URL no está
// en ese paso del build (pasó en el primer deploy de glamify a Vercel), el
// build entero falla aunque ninguna ruta toque la DB. El Proxy de abajo
// resuelve el cliente real recién al primer acceso a una propiedad
// (`prisma.product`, `prisma.$transaction`, ...), que solo pasa en runtime.
// ════════════════════════════════════════════════════════════════════════════

function resolveConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definida");
  // El driver `pg` no entiende params solo-Prisma como `pgbouncer`; los quitamos.
  return url.replace("?pgbouncer=true", "");
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: resolveConnectionString() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * Shim de compatibilidad: mantiene `import { prisma } from "@/lib/prisma"` en
 * todos los call sites. Cada acceso a una propiedad resuelve (y cachea) el
 * singleton real de forma perezosa vía `getDb()`.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
