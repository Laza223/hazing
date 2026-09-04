import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Corrida manual — CI no ejecuta Playwright hoy (confirmado en
// .github/workflows/ci.yml). NO se afirma nada sobre el guion visual del
// scroll acá (riesgo de WebGL headless poco confiable en CI); esa
// verificación es responsabilidad de `verificacion-ux` en navegador real
// (docs/spec/05-direccion-arte.md §6, §13).

test.beforeEach(async ({ page }) => {
  // La entrada de marca (BrandEntrance) solo corre la primera vez por sesión
  // y cubre toda la pantalla mientras anima — la desactivamos para poder
  // inspeccionar el momento inmersivo sin esperar esa coreografía (no es lo
  // que se está probando en este archivo).
  await page.addInitScript(() => {
    window.sessionStorage.setItem("hazing:brand-entrance-seen", "1");
  });
});

test.describe("momento inmersivo 'La etiqueta' — reduced motion", () => {
  test.use({ colorScheme: "light" });

  test("con prefers-reduced-motion: reduce, renderiza el fallback accesible sin <canvas>", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Sin canvas: el gate de capacidad corta el flujo antes del import
    // dinámico de three (docs/spec/05-direccion-arte.md §6 "Mobile y fallbacks").
    await expect(page.locator("canvas")).toHaveCount(0);

    await expect(page.getByText("01 — La marca")).toBeVisible();
    await expect(page.getByText(/HAZING — Luján, Buenos Aires/)).toBeVisible();
    await expect(
      page.getByText("Prendas que no necesitan ruido."),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("momento inmersivo 'La etiqueta' — escena real", () => {
  test("la sección existe en el DOM con el nodo accesible del dorso, sin errores de consola", async ({
    page,
  }) => {
    // Rutas enlazadas por el shell (header/menú/footer) que todavía no
    // existen: se construyen en Fase 6/7. Next las prefetchea y devuelven 404,
    // lo que ensucia la consola sin ser un defecto de esta sub-fase. Se
    // filtran de forma EXPLÍCITA y acotada — cualquier otro error de consola
    // (incluido un 404 de un asset real) sigue rompiendo el test.
    const RUTAS_PENDIENTES_FASE_6 = [
      "/carrito",
      "/cuenta",
      "/tienda",
      "/lookbook",
      "/marca",
      "/contacto",
      "/arrepentimiento",
      "/privacidad",
    ];
    const esPrefetchDeRutaPendiente = (texto: string) =>
      texto.includes("404") &&
      RUTAS_PENDIENTES_FASE_6.some((r) => texto.includes(r));

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    // El texto del mensaje de consola de un 404 no trae la URL, así que la
    // correlacionamos con las respuestas fallidas de la red.
    const respuestas404: string[] = [];
    page.on("response", (r) => {
      if (r.status() === 404) respuestas404.push(r.url());
    });

    await page.goto("/");

    // Nodo accesible del dorso (§11) — contenido HTML real del servidor,
    // en paralelo a la textura decorativa del mesh 3D.
    await expect(
      page.getByText(
        /HAZING — Luján, Buenos Aires — Talle · Color — N° HZG-000000/,
      ),
    ).toBeAttached();

    // Todo 404 observado tiene que ser de una ruta pendiente de Fase 6.
    const inesperados404 = respuestas404.filter(
      (url) => !RUTAS_PENDIENTES_FASE_6.some((r) => url.includes(r)),
    );
    expect(
      inesperados404,
      `404 inesperados: ${inesperados404.join(", ")}`,
    ).toEqual([]);

    const erroresReales = consoleErrors.filter(
      (t) => !esPrefetchDeRutaPendiente(t) && !t.includes("404"),
    );
    expect(
      erroresReales,
      `errores de consola: ${erroresReales.join(" | ")}`,
    ).toEqual([]);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
