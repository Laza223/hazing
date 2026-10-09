import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  quoteMicorreo,
  pickRate,
  orderWeightGr,
  isMicorreoConfigured,
  PACKAGE_CM,
  __resetMicorreoAuthCache,
  type MicorreoEnv,
} from "@/lib/shipping/micorreo";

const env: MicorreoEnv = {
  MICORREO_EMAIL: "e@x.com",
  MICORREO_PASSWORD: "pw",
  MICORREO_GATEWAY_AUTH: "GATEWAY",
};
const jsonRes = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response;

function makeFetch(
  rates: unknown = {
    rates: [
      { productType: "CP", price: 4000 },
      { productType: "EP", price: 9000 },
    ],
  },
) {
  return vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/token"))
      return jsonRes({ token: "JWT", expire: "2099-01-01T00:00:00Z" });
    if (u.endsWith("/users/validate")) return jsonRes({ customerId: 777 });
    if (u.endsWith("/rates")) return jsonRes(rates);
    throw new Error("url inesperada " + u);
  });
}
const asFetch = (f: ReturnType<typeof makeFetch>) =>
  f as unknown as typeof fetch;

describe("pesos y paquete", () => {
  it("400 g por unidad con mínimo de 500 g", () => {
    expect(orderWeightGr(1)).toBe(500);
    expect(orderWeightGr(2)).toBe(800);
    expect(orderWeightGr(5)).toBe(2000);
  });
  it("un paquete de 25x20x5", () => {
    expect(PACKAGE_CM).toEqual({ length: 25, width: 20, height: 5 });
  });
});

describe("quoteMicorreo", () => {
  beforeEach(() => __resetMicorreoAuthCache());

  it("sin credenciales → null y sin red", async () => {
    const f = makeFetch();
    expect(isMicorreoConfigured({})).toBe(false);
    expect(
      await quoteMicorreo(
        { cpDestino: "1414", pesoGr: 500, metodo: "domicilio" },
        {},
        asFetch(f),
      ),
    ).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("autentica, manda D/S, peso y medidas, y devuelve el Clásico por default", async () => {
    const f = makeFetch();
    const q = await quoteMicorreo(
      { cpDestino: " 1414 ", pesoGr: 800, metodo: "sucursal" },
      env,
      asFetch(f),
      1000,
    );
    expect(q).toEqual({ cost: 4000, carrier: "Correo Argentino" });
    const rates = f.mock.calls.find(([u]) => String(u).endsWith("/rates"))!;
    expect(String(rates[0])).toBe(
      "https://api.correoargentino.com.ar/micorreo/v1/rates",
    );
    expect(JSON.parse(String((rates[1] as RequestInit).body))).toEqual({
      customerId: "777",
      postalCodeOrigin: "6700",
      postalCodeDestination: "1414",
      deliveredType: "S",
      dimensions: { weight: 800, length: 25, width: 20, height: 5 },
    });
    const tokenCall = f.mock.calls[0];
    expect((tokenCall[1] as RequestInit).headers).toMatchObject({
      Authorization: "Basic GATEWAY",
    });
  });

  it("velocidad express, CP de origen y sandbox por env", async () => {
    const f = makeFetch();
    const q = await quoteMicorreo(
      { cpDestino: "1414", pesoGr: 500, metodo: "domicilio" },
      {
        ...env,
        MICORREO_VELOCITY: "express",
        MICORREO_ORIGIN_CP: "1000",
        MICORREO_SANDBOX: "1",
      },
      asFetch(f),
      1000,
    );
    expect(q?.cost).toBe(9000);
    expect(String(f.mock.calls[0][0])).toContain("apitest.");
    const rates = f.mock.calls.find(([u]) => String(u).endsWith("/rates"))!;
    expect(JSON.parse(String((rates[1] as RequestInit).body))).toMatchObject({
      postalCodeOrigin: "1000",
      deliveredType: "D",
    });
  });

  it("cachea el token entre cotizaciones", async () => {
    const f = makeFetch();
    const input = {
      cpDestino: "1414",
      pesoGr: 500,
      metodo: "domicilio" as const,
    };
    await quoteMicorreo(input, env, asFetch(f), 1000);
    await quoteMicorreo(input, env, asFetch(f), 2000);
    expect(
      f.mock.calls.filter(([u]) => String(u).endsWith("/token")),
    ).toHaveLength(1);
  });

  it("nunca rompe: HTTP de error, red caída o tarifa ausente → null", async () => {
    const input = {
      cpDestino: "1414",
      pesoGr: 500,
      metodo: "domicilio" as const,
    };
    const noToken = vi.fn(async () => jsonRes({}, false));
    expect(
      await quoteMicorreo(input, env, asFetch(noToken as never), 1000),
    ).toBeNull();
    __resetMicorreoAuthCache();
    const boom = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect(
      await quoteMicorreo(input, env, asFetch(boom as never), 1000),
    ).toBeNull();
    __resetMicorreoAuthCache();
    expect(
      await quoteMicorreo(input, env, asFetch(makeFetch({ rates: [] })), 1000),
    ).toBeNull();
  });
});

describe("pickRate", () => {
  it("descarta precios inválidos", () => {
    expect(
      pickRate({ rates: [{ productType: "CP", price: 0 }] }, "CP"),
    ).toBeNull();
    expect(pickRate({ rates: [{ productType: "CP" }] }, "CP")).toBeNull();
    expect(pickRate({}, "CP")).toBeNull();
  });
});
