import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  // La entrada de marca (BrandEntrance) solo corre la primera vez por sesión
  // y cubre toda la pantalla mientras anima — la desactivamos acá para poder
  // interactuar con el header sin esperar la coreografía. No es lo que se
  // está probando en este archivo (es la sub-fase 5.2/beat 1 de la home).
  await page.addInitScript(() => {
    window.sessionStorage.setItem("hazing:brand-entrance-seen", "1");
  });
});

test.describe("shell del storefront", () => {
  test("el header muestra el wordmark y el trigger de menú", async ({
    page,
  }) => {
    await page.goto("/");

    // El wordmark es un SVG inline decorativo (aria-hidden) — el nombre
    // accesible lo da el <Link aria-label="Hazing"> que lo envuelve (ver
    // src/components/brand/wordmark.tsx).
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Hazing" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /menú/i })).toBeVisible();
  });

  test("el menú fullscreen abre con ítems numerados y cierra con Escape", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /menú/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Nombres exactos: "Hazing" también aparece en el link de Instagram
    // ("@hazing.ok") del pie del propio menú, así que un match parcial
    // resolvería a dos elementos (strict mode violation de Playwright).
    await expect(
      dialog.getByRole("link", { name: "01 Nuevo", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "02 Tienda", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "03 Lookbook", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "04 Hazing", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "05 Contacto", exact: true }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("los ítems del menú tienen foco visible por teclado (regresión WCAG 2.4.7)", async ({
    page,
  }) => {
    // Hallazgo de la revisión adversarial de 5.1b: `outline-none` sin
    // `focus-visible:outline` dejaba los 5 links principales sin ningún
    // indicio visual de foco — invisible para navegación por teclado.
    await page.goto("/");
    await page.getByRole("button", { name: /menú/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const firstItem = dialog.getByRole("link", { name: "01 Nuevo" });

    // `:focus-visible` depende de que el foco llegue por teclado real (no
    // por `.focus()` programático, que Chromium no siempre trata como
    // "visible") — tabulamos de verdad hasta llegar al primer ítem.
    for (let i = 0; i < 10; i++) {
      if (await firstItem.evaluate((el) => el === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(firstItem).toBeFocused();

    const outline = await firstItem.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, color: style.outlineColor };
    });
    expect(outline.style).toBe("solid");
    // transparente (rgba con alpha 0) = sin foco visible real, aunque el
    // outline-style diga "solid" (outline-none de Tailwind deja justamente
    // outline: 2px solid transparent).
    expect(outline.color).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("el footer está presente con Instagram y WhatsApp", async ({ page }) => {
    await page.goto("/");

    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/instagram/i)).toBeVisible();
    await expect(footer.getByText(/whatsapp/i)).toBeVisible();
  });
});

test.describe("accesibilidad del shell", () => {
  test("home sin violaciones de axe (menú cerrado)", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2),
    ).toEqual([]);
  });

  test("home sin violaciones de axe (menú abierto)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /menú/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2),
    ).toEqual([]);
  });
});
