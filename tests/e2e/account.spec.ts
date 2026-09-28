import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Corrida manual (mismo patrón que tests/e2e/storefront-commerce.spec.ts) —
// cubre Fase 6.4 (cuenta de clienta) SIN sesión: Supabase Auth acá es el
// proyecto real, así que no nos registramos ni pedimos recuperación con
// emails reales. Los flujos con sesión (clienta logueada) quedan como
// test.skip con el cuerpo completo, pendientes de una usuaria de prueba con
// OK de Lazar.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("hazing:brand-entrance-seen", "1");
  });
});

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    // [data-mix-blend-difference]: mismo falso positivo de contraste de
    // axe-core con `mix-blend-mode` documentado en storefront-commerce.spec.ts
    // y src/components/layout/header.tsx.
    .exclude("[data-mix-blend-difference]")
    .analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

test.describe("caso 1 — /cuenta y /cuenta/favoritos sin sesión", () => {
  test("/cuenta redirige a /ingresar", async ({ page }) => {
    await page.goto("/cuenta");
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test("/cuenta/favoritos redirige a /ingresar", async ({ page }) => {
    await page.goto("/cuenta/favoritos");
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test("/cuenta/pedidos redirige a /ingresar", async ({ page }) => {
    await page.goto("/cuenta/pedidos");
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test("/cuenta/datos redirige a /ingresar", async ({ page }) => {
    await page.goto("/cuenta/datos");
    await expect(page).toHaveURL(/\/ingresar$/);
  });
});

test.describe("caso 2 — /ingresar: login, registro, recuperar", () => {
  test("rinde los tres modos y las validaciones nativas del navegador", async ({
    page,
  }) => {
    await page.goto("/ingresar");
    await expect(
      page.getByRole("heading", { name: "Tu cuenta" }),
    ).toBeVisible();

    // Modo "Ingresar" por default.
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();

    // Sin completar nada, el submit no navega (HTML5 required bloquea antes
    // de llegar a la Server Action) — el email queda inválido.
    await page.getByRole("button", { name: "Ingresar" }).nth(1).click();
    const emailValid = await page
      .locator("#email")
      .evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(emailValid).toBe(false);
    await expect(page).toHaveURL(/\/ingresar$/);

    // Cambiar a "Crear cuenta": aparece Nombre + checkbox de consentimiento.
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(
      page.getByText("Quiero recibir novedades y recordatorios de mi carrito."),
    ).toBeVisible();

    // Volver a "Ingresar" y entrar a "Olvidé mi contraseña": el form de
    // password/nombre desaparece, solo queda el email.
    await page.getByRole("button", { name: "Ingresar" }).first().click();
    await page.getByRole("button", { name: "Olvidé mi contraseña" }).click();
    await expect(page.getByLabel("Contraseña")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Enviar link" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "← Volver a ingresar" }).click();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
  });

  test("login con credenciales inválidas muestra el mensaje de error", async ({
    page,
  }) => {
    // Llama de verdad a Supabase Auth (signInWithPassword) pero NO crea nada:
    // un email inexistente solo dispara la rama de error.
    await page.goto("/ingresar");
    await page.getByLabel("Email").fill("noexiste@hazing.test");
    await page.getByLabel("Contraseña").fill("cualquier-password-123");
    await page.getByRole("button", { name: "Ingresar" }).nth(1).click();

    // role=alert también matchea el route-announcer de Next
    // (#__next-route-announcer__), que arranca vacío: se ancla al <p> del
    // formulario por su texto para evitar la violación de modo estricto.
    const alert = page.locator('p[role="alert"]');
    await expect(alert).toHaveText("Email o contraseña incorrectos.");
    await expect(page).toHaveURL(/\/ingresar$/);
  });

  test("?next=//evil.com no redirige afuera del sitio", async ({ page }) => {
    await page.goto("/ingresar?next=//evil.com");
    // La URL de entrada obviamente contiene "evil.com" en el query string (lo
    // escribimos nosotras) — lo que importa es que ninguna navegación
    // disparada por la app (sanitizeNext en src/lib/http/sanitize-next.ts)
    // termine con el browser en ese origin. Con login inválido la app nunca
    // navega, así que esto es una guarda de smoke: el control real (que un
    // login VÁLIDO con este next cae al fallback "/cuenta" en vez de afuera)
    // vive en el test.skip de abajo, pendiente de usuaria de prueba.
    const sameOrigin = () => new URL(page.url()).origin;
    const startOrigin = sameOrigin();
    await page.getByLabel("Email").fill("noexiste@hazing.test");
    await page.getByLabel("Contraseña").fill("cualquier-password-123");
    await page.getByRole("button", { name: "Ingresar" }).nth(1).click();
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    expect(sameOrigin()).toBe(startOrigin);
  });

  test.skip("login válido con ?next=//evil.com no redirige afuera del sitio (requiere usuaria de prueba, pendiente de OK de Lazar)", async ({
    page,
  }) => {
    // Cuerpo completo para cuando exista una clienta de prueba real:
    await page.goto("/ingresar?next=//evil.com");
    await page.getByLabel("Email").fill("clienta-de-prueba@hazing.test");
    await page.getByLabel("Contraseña").fill("password-de-prueba-123");
    await page.getByRole("button", { name: "Ingresar" }).nth(1).click();
    // sanitizeNext cae a "/cuenta": jamás navega a un origin externo.
    await expect(page).toHaveURL(/\/cuenta$/);
    expect(page.url()).not.toContain("evil.com");
  });

  test("axe sin violaciones en desktop", async ({ page }) => {
    await page.goto("/ingresar");
    await expect(
      page.getByRole("heading", { name: "Tu cuenta" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test.describe("mobile (375×812)", () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

    test("axe sin violaciones en mobile", async ({ page }) => {
      await page.goto("/ingresar");
      await expect(
        page.getByRole("heading", { name: "Tu cuenta" }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
});

test.describe("caso 3 — PDP como invitada", () => {
  test("el corazón de favoritos lleva a /ingresar?next=/producto/...", async ({
    page,
  }) => {
    await page.goto("/producto/demo-remera-basica-algodon");
    await page.getByRole("button", { name: "Agregar a favoritos" }).click();
    await expect(page).toHaveURL(
      "/ingresar?next=%2Fproducto%2Fdemo-remera-basica-algodon",
    );
  });

  test("la sección de reseñas es visible para una invitada", async ({
    page,
  }) => {
    await page.goto("/producto/demo-remera-basica-algodon");
    await expect(
      page.getByRole("button", { name: "Escribir reseña" }),
    ).toBeVisible();
  });

  test("el header tiene el link 'Cuenta'", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Cuenta" }).first(),
    ).toBeVisible();
  });
});

test.describe("caso 4 — reseña de invitada queda pendiente de moderación", () => {
  test("no se publica: el estado devuelto es 'pending' y no aparece en la lista pública", async ({
    page,
  }) => {
    // Escribe de verdad en la base LOCAL (aceptado por la consigna) — lo que
    // se verifica es que el flujo de moderación la deje oculta.
    const slug = "demo-jean-recto-clasico";
    await page.goto(`/producto/${slug}`);
    await page.getByRole("button", { name: "Escribir reseña" }).click();

    // RatingInput: botones de estrella sin rótulo textual propio en el form —
    // se localiza el grupo y se clickea la última estrella (5) por posición.
    const ratingGroup = page.locator("form").getByRole("radiogroup").first();
    if (await ratingGroup.count()) {
      await ratingGroup.getByRole("radio").last().click();
    } else {
      // Fallback: si RatingInput no expone role=radiogroup, clickeamos el
      // último botón dentro del bloque de estrellas por posición.
      const stars = page.locator(
        "form button[name='rating'], form [aria-label*='estrella' i]",
      );
      if (await stars.count()) await stars.last().click();
    }

    const authorName = page.getByLabel("Tu nombre");
    await authorName.fill(`Clienta E2E ${Date.now()}`);
    await page
      .getByLabel("Tu experiencia")
      .fill("Reseña de prueba automatizada — no debería publicarse sola.");

    await page.getByRole("button", { name: "Publicar reseña" }).click();

    // El propio form comunica el estado ("Se publica en breve, tras la
    // moderación") — no debería decir que ya está publicada.
    await expect(
      page.getByText(
        "¡Gracias por tu reseña! Se publica en breve, tras la moderación.",
      ),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("¡Gracias por tu reseña! Ya está publicada."),
    ).toHaveCount(0);

    // Recarga fresca de la PDP: la reseña recién creada no debe aparecer en
    // la lista pública (solo se listan approved — src/lib/reviews/queries.ts).
    await page.goto(`/producto/${slug}`);
    await expect(
      page.getByText(
        "Reseña de prueba automatizada — no debería publicarse sola.",
      ),
    ).toHaveCount(0);
  });
});
