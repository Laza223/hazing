import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Corrida manual — CI no ejecuta Playwright hoy (confirmado en
// .github/workflows/ci.yml), mismo patrón que el resto de tests/e2e/*.
// Cubre las páginas legales/institucionales de la sub-fase 6.5
// (docs/spec/06-storefront.md §1 fila 6.5).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("hazing:brand-entrance-seen", "1");
  });
});

const LEGAL_PAGES: Array<{ path: string; heading: string }> = [
  { path: "/arrepentimiento", heading: "Botón de Arrepentimiento" },
  { path: "/privacidad", heading: "Política de Privacidad" },
  { path: "/terminos", heading: "Términos y Condiciones" },
  { path: "/envios-y-cambios", heading: "Envíos y cambios" },
  { path: "/guia-de-talles", heading: "Guía de talles" },
  { path: "/preguntas-frecuentes", heading: "Preguntas frecuentes" },
  { path: "/contacto", heading: "Contacto" },
];

test.describe("páginas legales e institucionales", () => {
  for (const { path, heading } of LEGAL_PAGES) {
    test(`${path} responde y pasa axe sin violaciones`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();

      // [data-mix-blend-difference]: exclusión compartida con el resto de
      // tests/e2e/*.spec.ts (ver storefront-shell.spec.ts) — no aplica en
      // estas páginas de texto, se mantiene por consistencia si el shell
      // (header/footer) lo introduce en el layout.
      const results = await new AxeBuilder({ page })
        .exclude("[data-mix-blend-difference]")
        .analyze();
      expect(
        results.violations,
        JSON.stringify(results.violations, null, 2),
      ).toEqual([]);
    });
  }
});

test.describe("formulario de arrepentimiento", () => {
  test("no envía y muestra errores de validación con campos vacíos", async ({
    page,
  }) => {
    await page.goto("/arrepentimiento");

    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    // La constancia de éxito no aparece: el navegador bloqueó el submit por
    // los campos requeridos (nombre y email) antes de llegar al Server Action.
    await expect(page.getByRole("status")).toHaveCount(0);
    const nameValid = await page
      .locator("#contactName")
      .evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(nameValid).toBe(false);
  });
});
