import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isAdminGatedPath } from "@/lib/admin/route-gate";

describe("isAdminGatedPath", () => {
  it("protege /admin y sus subrutas", () => {
    for (const p of ["/admin", "/admin/pedidos", "/admin/pedidos/abc"]) {
      expect(isAdminGatedPath(p)).toBe(true);
    }
  });
  it("deja pasar /admin/login y rutas fuera de /admin", () => {
    for (const p of [
      "/admin/login",
      "/admin/login/x",
      "/cuenta",
      "/administrador",
    ]) {
      expect(isAdminGatedPath(p)).toBe(false);
    }
  });
});

describe("cada page del panel admin llama requireAdmin()", () => {
  const root = path.join(process.cwd(), "src/app/admin/(panel)");
  const pages = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? pages(path.join(dir, e.name))
          : e.name === "page.tsx"
            ? [path.join(dir, e.name)]
            : [],
      );

  const files = pages(root);
  it("encuentra pages", () => expect(files.length).toBeGreaterThan(0));
  it.each(files.map((f) => [path.relative(root, f), f]))("%s", (_n, f) => {
    expect(fs.readFileSync(f, "utf8")).toMatch(/await requireAdmin\(\)/);
  });
});
