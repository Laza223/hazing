import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Corrida manual (mismo patrón que el resto de tests/e2e/*) — cubre Fase 7
// (panel admin) SIN sesión: Supabase Auth acá es el proyecto real, así que no
// nos registramos ni logueamos con credenciales reales. Los flujos con sesión
// de owner/admin quedan como test.skip con el cuerpo completo, pendientes de
// una usuaria de prueba con OK de Lazar.

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

test.describe("caso 1 — rutas del panel sin sesión redirigen a /admin/login", () => {
  test("/admin redirige a /admin/login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("/admin/productos redirige a /admin/login", async ({ page }) => {
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("/admin/pedidos redirige a /admin/login", async ({ page }) => {
    await page.goto("/admin/pedidos");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("/admin/categorias redirige a /admin/login", async ({ page }) => {
    await page.goto("/admin/categorias");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("/admin/cupones redirige a /admin/login", async ({ page }) => {
    await page.goto("/admin/cupones");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("/admin/resenas redirige a /admin/login", async ({ page }) => {
    await page.goto("/admin/resenas");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("caso 2 — /admin/login rinde y valida", () => {
  test("renderiza el form con email y contraseña", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(
      page.getByRole("heading", { name: "Iniciá sesión" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("sin completar nada, el submit no navega (validación nativa required)", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Entrar" }).click();
    const emailValid = await page
      .locator("#email")
      .evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(emailValid).toBe(false);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("login con credenciales inválidas muestra un error comprensible", async ({
    page,
  }) => {
    // Llama de verdad a Supabase Auth (signInWithPassword) pero NO crea nada:
    // un email inexistente solo dispara la rama de error.
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("noexiste@hazing.test");
    await page.getByLabel("Contraseña").fill("cualquier-password-123");
    await page.getByRole("button", { name: "Entrar" }).click();

    // role=alert también matchea el route-announcer de Next
    // (#__next-route-announcer__, vacío) — se ancla al <p role="alert"> del
    // formulario para evitar la violación de modo estricto (mismo hallazgo
    // que en tests/e2e/account.spec.ts).
    await expect(page.locator('p[role="alert"]')).toHaveText(
      "Email o contraseña incorrectos.",
    );
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("axe sin violaciones en desktop", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(
      page.getByRole("heading", { name: "Iniciá sesión" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test.describe("mobile (375×812)", () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

    test("axe sin violaciones en mobile", async ({ page }) => {
      await page.goto("/admin/login");
      await expect(
        page.getByRole("heading", { name: "Iniciá sesión" }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
});

test.describe("caso 3 — aislamiento: una clienta no es admin", () => {
  test.skip("una cuenta de Customer (sin fila User owner/admin) no puede entrar al panel (requiere usuaria de prueba, pendiente de OK de Lazar)", async ({
    page,
  }) => {
    // Cuerpo completo para cuando exista una clienta de prueba real sin
    // fila User: signInAction en src/app/admin/login/actions.ts hace
    // signInWithPassword + getAdminUser() y si no hay fila User con role
    // owner/admin, hace signOut() y devuelve error — control NEGATIVO de
    // autorización (no alcanza con tener sesión de Supabase Auth válida).
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("clienta-de-prueba@hazing.test");
    await page.getByLabel("Contraseña").fill("password-de-prueba-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Esta cuenta no tiene permisos de administración.",
    );
    await expect(page).toHaveURL(/\/admin\/login$/);
    // Control positivo (misma corrida): una cuenta owner/admin real SÍ entra.
    await page.getByLabel("Email").fill("owner-de-prueba@hazing.test");
    await page.getByLabel("Contraseña").fill("password-de-prueba-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
