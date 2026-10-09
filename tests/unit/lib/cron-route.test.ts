import { describe, it, expect, afterEach, vi } from "vitest";

// La ruta del cron es pública en Vercel: el único control de acceso es el
// header `Authorization: Bearer $CRON_SECRET` que Vercel Cron agrega solo.
// Estos casos cubren que sin secreto configurado, o con uno distinto, la ruta
// no corre los jobs (que mandan emails y cancelan pedidos).

const { runAbandonedCartJob, runOrderExpiryJob, deleteMany } = vi.hoisted(
  () => ({
    runAbandonedCartJob: vi.fn(),
    runOrderExpiryJob: vi.fn(),
    deleteMany: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({ prisma: { rateLimit: { deleteMany } } }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/cart/abandoned-job", () => ({ runAbandonedCartJob }));
vi.mock("@/lib/orders/expiry-job", () => ({ runOrderExpiryJob }));

const { GET } = await import("@/app/api/cron/route");

function request(authorization?: string): Request {
  return new Request("http://localhost/api/cron", {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/cron", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    vi.clearAllMocks();
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("401 y sin correr jobs si CRON_SECRET no está configurado", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request("Bearer "));
    expect(res.status).toBe(401);
    expect(runAbandonedCartJob).not.toHaveBeenCalled();
    expect(runOrderExpiryJob).not.toHaveBeenCalled();
  });

  it("401 y sin correr jobs con un secreto distinto", async () => {
    process.env.CRON_SECRET = "correcto";
    const res = await GET(request("Bearer otro"));
    expect(res.status).toBe(401);
    expect(runAbandonedCartJob).not.toHaveBeenCalled();
  });

  it("corre los dos jobs con el secreto correcto", async () => {
    process.env.CRON_SECRET = "correcto";
    runAbandonedCartJob.mockResolvedValue({ sent: 0 });
    runOrderExpiryJob.mockResolvedValue({ cancelled: 0 });
    deleteMany.mockResolvedValue({ count: 3 });
    const res = await GET(request("Bearer correcto"));
    expect(res.status).toBe(200);
    expect(runAbandonedCartJob).toHaveBeenCalledOnce();
    expect(runOrderExpiryJob).toHaveBeenCalledOnce();
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      rateLimits: { deleted: 3 },
    });
  });

  it("purga RateLimit con windowStart de hace mas de 24 h", async () => {
    process.env.CRON_SECRET = "correcto";
    runAbandonedCartJob.mockResolvedValue({ sent: 0 });
    runOrderExpiryJob.mockResolvedValue({ cancelled: 0 });
    deleteMany.mockResolvedValue({ count: 0 });
    const before = Date.now();
    await GET(request("Bearer correcto"));
    const arg = deleteMany.mock.calls[0][0] as {
      where: { windowStart: { lt: Date } };
    };
    const lt = arg.where.windowStart.lt.getTime();
    const day = 24 * 60 * 60 * 1000;
    expect(lt).toBeGreaterThanOrEqual(before - day);
    expect(lt).toBeLessThanOrEqual(Date.now() - day);
  });

  it("si un job falla, el otro corre igual y ok queda en false", async () => {
    process.env.CRON_SECRET = "correcto";
    runAbandonedCartJob.mockRejectedValue(new Error("resend caído"));
    runOrderExpiryJob.mockResolvedValue({ cancelled: 2 });
    deleteMany.mockResolvedValue({ count: 0 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(request("Bearer correcto"));
    expect(res.status).toBe(500);
    expect(runOrderExpiryJob).toHaveBeenCalledOnce();
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      expiry: { cancelled: 2 },
    });
  });
});
