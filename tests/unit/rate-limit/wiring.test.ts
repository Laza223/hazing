import { describe, it, expect, vi, beforeEach } from "vitest";

// Cableado: cada accion publica consulta el rate limit ANTES de tocar Supabase
// o la DB, y devuelve el error de limite tal cual cuando esta bloqueada.

const m = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  createClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  customerFindUnique: vi.fn(),
  couponFindUnique: vi.fn(),
  getCustomer: vi.fn(),
  getAdminUser: vi.fn(),
  createReview: vi.fn(),
  createRetractionRequest: vi.fn(),
  loadCurrentCart: vi.fn(),
  loadCart: vi.fn(),
  getCartIdFromCookie: vi.fn(),
}));

const LIMITED = { ok: false, error: "Demasiados intentos. Probá de nuevo." };

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: m.enforceRateLimit }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.createClient }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findUnique: m.customerFindUnique },
    coupon: { findUnique: m.couponFindUnique },
  },
}));
vi.mock("@/lib/customer/auth", () => ({ getCustomer: m.getCustomer }));
vi.mock("@/lib/admin/auth", () => ({ getAdminUser: m.getAdminUser }));
vi.mock("@/lib/reviews/service", () => ({ createReview: m.createReview }));
vi.mock("@/lib/legal/retraction/service", () => ({
  createRetractionRequest: m.createRetractionRequest,
}));
vi.mock("@/lib/cart/cart-service", () => ({
  loadCurrentCart: m.loadCurrentCart,
  loadCart: m.loadCart,
  createCart: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  removeItem: vi.fn(),
  cartToCheckoutLines: vi.fn(),
}));
vi.mock("@/lib/cart/cart-cookie", () => ({
  getCartIdFromCookie: m.getCartIdFromCookie,
  setCartIdCookie: vi.fn(),
  getCouponCodeFromCookie: vi.fn(),
  setCouponCodeCookie: vi.fn(),
}));
vi.mock("@/lib/orders/checkout-service", () => ({
  createCheckout: vi.fn(),
  defaultCheckoutDeps: {},
}));
vi.mock("@/lib/orders/checkout-data", () => ({
  getShippingZonesForQuote: vi.fn(),
  getFreeShippingThreshold: vi.fn(),
  shippingQuoteDeps: {},
}));
vi.mock("@/lib/http/base-url", () => ({
  getAuthBaseUrl: vi.fn().mockResolvedValue("http://localhost"),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

const auth = await import("@/app/(storefront)/ingresar/actions");
const adminLogin = await import("@/app/admin/login/actions");
const reviews =
  await import("@/app/(storefront)/producto/[slug]/review-actions");
const retraction = await import("@/app/(storefront)/arrepentimiento/actions");
const store = await import("@/app/(storefront)/actions");

function expectNoDbNoSupabase() {
  expect(m.createClient).not.toHaveBeenCalled();
  expect(m.customerFindUnique).not.toHaveBeenCalled();
  expect(m.couponFindUnique).not.toHaveBeenCalled();
  expect(m.getCustomer).not.toHaveBeenCalled();
  expect(m.getAdminUser).not.toHaveBeenCalled();
  expect(m.createReview).not.toHaveBeenCalled();
  expect(m.createRetractionRequest).not.toHaveBeenCalled();
  expect(m.loadCurrentCart).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  m.createClient.mockResolvedValue({
    auth: {
      signInWithPassword: m.signInWithPassword,
      signUp: m.signUp,
      resetPasswordForEmail: m.resetPasswordForEmail,
      signOut: vi.fn(),
    },
  });
});

const creds = { email: "a@b.com", password: "x" };
const signUpInput = { ...creds, name: "Ana", marketingConsent: false };
const emptyCheckout = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  shippingMethod: "domicilio" as const,
  address: { cp: "", province: "", street: "", number: "", city: "" },
  acceptedTerms: false,
};

describe("cuando el limite bloquea: devuelve el error y no toca Supabase ni DB", () => {
  beforeEach(() => m.enforceRateLimit.mockResolvedValue(LIMITED));

  it("signInAction (login)", async () => {
    expect(await auth.signInAction(creds)).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("login");
    expectNoDbNoSupabase();
  });

  it("signUpAction (signup)", async () => {
    expect(await auth.signUpAction(signUpInput)).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("signup");
    expectNoDbNoSupabase();
  });

  it("requestPasswordResetAction (recover)", async () => {
    expect(await auth.requestPasswordResetAction("a@b.com")).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("recover");
    expectNoDbNoSupabase();
  });

  it("adminLogin (signInAction admin)", async () => {
    expect(await adminLogin.signInAction("a@b.com", "x")).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("adminLogin");
    expectNoDbNoSupabase();
  });

  it("createReviewAction (review)", async () => {
    const fd = new FormData();
    fd.set("productId", "p1");
    expect(await reviews.createReviewAction(fd)).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("review");
    expectNoDbNoSupabase();
  });

  it("requestRetractionAction (retraction)", async () => {
    expect(
      await retraction.requestRetractionAction({
        contactName: "Ana Perez",
        contactEmail: "a@b.com",
      }),
    ).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("retraction");
    expectNoDbNoSupabase();
  });

  it("createCheckoutAction (checkout)", async () => {
    expect(await store.createCheckoutAction(emptyCheckout)).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("checkout");
    expectNoDbNoSupabase();
  });

  it("applyCouponAction (coupon)", async () => {
    expect(await store.applyCouponAction("PROMO")).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("coupon");
    expectNoDbNoSupabase();
  });

  it("quoteShippingAction (quote): no cotiza contra MiCorreo", async () => {
    expect(await store.quoteShippingAction({ cp: "1900" })).toEqual(LIMITED);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("quote");
    expect(m.loadCurrentCart).not.toHaveBeenCalled();
    expectNoDbNoSupabase();
  });
});

describe("cuando el limite deja pasar (null): la accion sigue", () => {
  beforeEach(() => m.enforceRateLimit.mockResolvedValue(null));

  it("signInAction", async () => {
    m.signInWithPassword.mockResolvedValue({ error: { message: "bad" } });
    const res = await auth.signInAction(creds);
    expect(res).toEqual({
      ok: false,
      error: "Email o contraseña incorrectos.",
    });
    expect(m.signInWithPassword).toHaveBeenCalledOnce();
  });

  it("signUpAction", async () => {
    m.customerFindUnique.mockResolvedValue({ id: "c1" });
    const res = await auth.signUpAction(signUpInput);
    expect(res.ok).toBe(false);
    expect(m.customerFindUnique).toHaveBeenCalledOnce();
  });

  it("requestPasswordResetAction mantiene el mensaje neutro", async () => {
    m.resetPasswordForEmail.mockResolvedValue({});
    expect(await auth.requestPasswordResetAction("a@b.com")).toEqual({
      ok: true,
    });
    expect(m.resetPasswordForEmail).toHaveBeenCalledOnce();
  });

  it("adminLogin", async () => {
    m.signInWithPassword.mockResolvedValue({ error: { message: "bad" } });
    await adminLogin.signInAction("a@b.com", "x");
    expect(m.signInWithPassword).toHaveBeenCalledOnce();
  });

  it("createReviewAction", async () => {
    m.getCustomer.mockResolvedValue(null);
    m.createReview.mockResolvedValue({ status: "pending" });
    const fd = new FormData();
    fd.set("productId", "p1");
    fd.set("slug", "s");
    const res = await reviews.createReviewAction(fd);
    expect(res).toEqual({ ok: true, status: "pending" });
    expect(m.createReview).toHaveBeenCalledOnce();
  });

  it("createReviewAction con honeypot lleno no consume cupo", async () => {
    const fd = new FormData();
    fd.set("website", "http://spam");
    await reviews.createReviewAction(fd);
    expect(m.enforceRateLimit).not.toHaveBeenCalled();
    expect(m.createReview).not.toHaveBeenCalled();
  });

  it("requestRetractionAction", async () => {
    m.createRetractionRequest.mockResolvedValue({
      ok: true,
      ticket: "ARR-000001",
      date: "2026-01-01",
    });
    const res = await retraction.requestRetractionAction({
      contactName: "Ana Perez",
      contactEmail: "a@b.com",
    });
    expect(res.ok).toBe(true);
    expect(m.createRetractionRequest).toHaveBeenCalledOnce();
  });

  it("requestRetractionAction con honeypot lleno no consume cupo", async () => {
    m.createRetractionRequest.mockResolvedValue({ ok: false, error: "x" });
    await retraction.requestRetractionAction({
      contactName: "Bot",
      contactEmail: "a@b.com",
      website: "http://spam",
    });
    expect(m.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("createCheckoutAction continua a la validacion del formulario", async () => {
    const res = await store.createCheckoutAction(emptyCheckout);
    expect(res.ok).toBe(false);
    expect(res.error).not.toBe(LIMITED.error);
    expect(m.enforceRateLimit).toHaveBeenCalledWith("checkout");
  });

  it("applyCouponAction consulta el cupon", async () => {
    m.couponFindUnique.mockResolvedValue(null);
    m.getCartIdFromCookie.mockResolvedValue(null);
    m.loadCart.mockResolvedValue({ cart: null, lines: [] });
    expect(await store.applyCouponAction("PROMO")).toEqual({
      ok: false,
      error: "Cupón inexistente.",
    });
    expect(m.couponFindUnique).toHaveBeenCalledOnce();
  });
});
