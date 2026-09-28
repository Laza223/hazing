import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl } from "@/lib/seo/url";

afterEach(() => vi.unstubAllEnvs());

describe("absoluteUrl", () => {
  it("antepone NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.hazing.store");
    expect(absoluteUrl("/tienda")).toBe("https://www.hazing.store/tienda");
  });

  it("env vacía cae a localhost en vez de romper", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(absoluteUrl("/")).toBe("http://localhost:3000/");
  });

  it("deja pasar URLs absolutas", () => {
    expect(absoluteUrl("https://x.test/a")).toBe("https://x.test/a");
  });
});
