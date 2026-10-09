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

    // "Productos" es un botón: abre el submenú de categorías en vez de navegar.
    await expect(
      dialog.getByRole("link", { name: "01 Nuevo", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "02 Productos", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "03 Contacto", exact: true }),
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

test.describe("home", () => {
  // El guion visual del scroll (pin del lookbook, entradas) lo verifica
  // `verificacion-ux` en un navegador real. Acá solo se confirma que las
  // secciones existen en el DOM servido.
  test("existen hero, marca, lookbook, editorial y cierre", async ({
    page,
  }) => {
    await page.goto("/");

    // Hero: único h1 con el statement y el link a la tienda.
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Nuevos ingresos, misma obsesión.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ver la tienda", exact: true }),
    ).toBeVisible();

    // "Nuevo" solo aparece con productos con foto: el seed de demo no tiene
    // fotos, así que no se exige acá.

    await expect(
      page.getByRole("heading", { name: "De Luján, para tu vestidor." }),
    ).toBeAttached();
    await expect(page.getByRole("region", { name: "Lookbook" })).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Outfits para todos tus planes." }),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Tu look completo, acá." }),
    ).toBeAttached();
  });
});

test.describe("home coreografiada en mobile (§4.1 y §9)", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("el lookbook NO se pinea en mobile: el documento sigue scrolleando", async ({
    page,
  }) => {
    // Regla dura del §4.1 y §9: en mobile el lookbook usa scroll horizontal
    // nativo con snap y NUNCA pin — secuestrar el scroll táctil es lo que más
    // frustra. Sin este test, un ScrollTrigger con pin colado en mobile pasa
    // desapercibido (la revisión adversarial de 5.2 lo señaló como hueco).
    await page.goto("/");

    const lookbook = page.getByRole("region", { name: "Lookbook" });
    await lookbook.scrollIntoViewIfNeeded();

    const antes = await page.evaluate(() => window.scrollY);
    // Un scroll vertical grande tiene que mover el documento de verdad: con
    // la sección pineada, el scrollY quedaría clavado mientras dura el pin.
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(600);
    const despues = await page.evaluate(() => window.scrollY);

    expect(despues).toBeGreaterThan(antes);

    // Y el viewport horizontal existe y es scrolleable de forma nativa.
    const track = page.getByRole("group", {
      name: "Lookbook — desplazamiento horizontal",
    });
    const overflowX = await track.evaluate(
      (el) => getComputedStyle(el).overflowX,
    );
    expect(overflowX, `overflow-x del track: ${overflowX}`).toBe("auto");
  });
});
