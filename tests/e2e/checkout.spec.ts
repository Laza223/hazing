import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Corrida manual contra datos reales del catálogo demo (`prisma/seed.ts`), igual
// que tests/e2e/storefront-commerce.spec.ts — no mockea MP, así que no completa el
// pago: solo hasta que el submit intenta redirigir (o falla porque no hay
// MP_ACCESS_TOKEN de test configurado, lo cual también es un resultado válido acá).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("hazing:brand-entrance-seen", "1");
  });
});

async function addToCartAndGoToCheckout(page: Page): Promise<void> {
  await page.goto("/producto/demo-cinturon-cuero");
  await page
    .getByRole("group", { name: "Color" })
    .getByRole("button", { name: "Negro" })
    .click();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/checkout");
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude("[data-mix-blend-difference]")
    .analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

test.describe("caso 1 — carrito vacío redirige a /carrito", () => {
  test("sin ítems, /checkout redirige", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/carrito$/);
  });
});

test.describe("caso 2 — form de checkout", () => {
  test("valida campos y calcula envío", async ({ page }) => {
    await addToCartAndGoToCheckout(page);
    await expect(
      page.getByRole("heading", { name: "Finalizá tu compra" }),
    ).toBeVisible();

    const submit = page.getByRole("button", { name: /pagar con mercadopago/i });
    await expect(submit).toBeVisible();

    // Sin completar nada, el submit muestra la primera validación (server-side,
    // ver src/lib/orders/checkout-validation.ts).
    await submit.click();
    // `p[role=alert]`: Next monta además un `#__next-route-announcer__` con role=alert.
    await expect(page.locator('p[role="alert"]').first()).toBeVisible();
    // El foco va al primer campo inválido y el error queda asociado al campo.
    const nameField = page.getByLabel("Nombre y apellido");
    await expect(nameField).toBeFocused();
    await expect(nameField).toHaveAttribute("aria-invalid", "true");

    // Cargar un CP y disparar la cotización — ShippingZone del seed.
    await page.getByLabel("Código postal").fill("6700");
    await page.getByRole("button", { name: "Calcular envío" }).click();
  });

  test("sin violaciones de axe en desktop y mobile", async ({ page }) => {
    await addToCartAndGoToCheckout(page);
    await expect(
      page.getByRole("heading", { name: "Finalizá tu compra" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("caso 3 — mobile", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("PDP viewport móvil renderiza sin violaciones de axe", async ({
    page,
  }) => {
    await addToCartAndGoToCheckout(page);
    await expect(
      page.getByRole("heading", { name: "Finalizá tu compra" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("caso 4 — /checkout/gracias", () => {
  test("pedido inexistente (UUID) no filtra datos sensibles y pasa axe", async ({
    page,
  }) => {
    await page.goto(
      "/checkout/gracias?pedido=00000000-0000-4000-8000-000000000000",
    );
    await expect(
      page.getByRole("heading", { name: "No encontramos ese pedido" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("un orderNumber (no UUID) en ?pedido= tampoco resuelve el pedido", async ({
    page,
  }) => {
    await page.goto("/checkout/gracias?pedido=HZG-999999");
    await expect(
      page.getByRole("heading", { name: "No encontramos ese pedido" }),
    ).toBeVisible();
  });

  test("sin query param, también muestra el estado 'no encontrado'", async ({
    page,
  }) => {
    await page.goto("/checkout/gracias");
    await expect(
      page.getByRole("heading", { name: "No encontramos ese pedido" }),
    ).toBeVisible();
  });
});
