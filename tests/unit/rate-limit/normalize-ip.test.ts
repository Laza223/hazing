import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { normalizeIp } = await import("@/lib/rate-limit");

describe("normalizeIp", () => {
  it("IPv4 queda intacta", () => {
    expect(normalizeIp("190.16.4.7")).toBe("190.16.4.7");
    expect(normalizeIp(" 8.8.8.8 ")).toBe("8.8.8.8");
  });

  it("IPv4 mapeada a IPv6 devuelve la IPv4", () => {
    expect(normalizeIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
    expect(normalizeIp("::FFFF:102:304")).toBe("1.2.3.4");
  });

  it("misma /64 produce la misma clave", () => {
    const a = normalizeIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    const b = normalizeIp("2001:0db8:0001:0002::1");
    expect(a).toBe("2001:db8:1:2::/64");
    expect(b).toBe(a);
  });

  it("/64 distinta produce clave distinta", () => {
    expect(normalizeIp("2001:db8:1:2::1")).not.toBe(
      normalizeIp("2001:db8:1:3::1"),
    );
  });

  it("formas comprimidas y loopback", () => {
    expect(normalizeIp("::1")).toBe("0:0:0:0::/64");
    expect(normalizeIp("::")).toBe("0:0:0:0::/64");
    expect(normalizeIp("2001:db8::")).toBe("2001:db8:0:0::/64");
    expect(normalizeIp("2001:db8::5:6:7:8")).toBe("2001:db8:0:0::/64");
    expect(normalizeIp("[2001:db8:1:2::9]")).toBe("2001:db8:1:2::/64");
    expect(normalizeIp("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("entradas invalidas devuelven null", () => {
    expect(normalizeIp("no-es-ip")).toBeNull();
    expect(normalizeIp("999.1.1.1")).toBeNull();
    expect(normalizeIp("1::2::3")).toBeNull();
    expect(normalizeIp("1:2:3:4:5:6:7:8:9")).toBeNull();
    expect(normalizeIp("")).toBeNull();
  });
});
