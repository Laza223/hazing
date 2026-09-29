import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Este spec ejercita el recorrido de compra (Fase 6: tienda → PDP → carrito)
// contra datos REALES del catálogo demo (`prisma/seed.ts`), no mocks — asume
// que la base está sembrada (`pnpm db:seed`, o la base local de `prisma dev`
// ya sembrada). CI no corre Playwright hoy (confirmado en
// .github/workflows/ci.yml) y aunque lo hiciera, no tiene esa base: por eso
// esto es una corrida manual.
//
// Slugs/variantes usados (ver prisma/seed.ts para los datos exactos):
// - demo-remera-basica-algodon: multi color (Negro/Blanco) × talle (S/M/L),
//   con L·Negro en stock 0 — sirve para probar "Agotado".
// - demo-jean-recto-clasico: color único (todas las variantes son "Azul").
// - demo-cinturon-cuero: `sizeSystem: one_size` (2 colores, un solo talle).
// - demo-buzo-oversize-friza: XL·Negro con stock 3 — sirve para probar el
//   tope del stepper de cantidad.

test.beforeEach(async ({ page }) => {
  // La entrada de marca (BrandEntrance) solo corre la primera vez por sesión
  // y cubre toda la pantalla mientras anima — la desactivamos acá para poder
  // interactuar con la tienda/PDP/carrito sin esperar esa coreografía (no es
  // lo que se está probando en este archivo). Mismo patrón que
  // tests/e2e/storefront-shell.spec.ts.
  await page.addInitScript(() => {
    window.sessionStorage.setItem("hazing:brand-entrance-seen", "1");
  });
});

/**
 * Agrega una variante al carrito desde la PDP (esperando a que el drawer
 * confirme el agregado) y navega a `/carrito` para verificar el estado
 * completo desde una carga fresca.
 */
async function addVariantAndGoToCart(
  page: Page,
  opts: { slug: string; color?: string; size?: string },
): Promise<void> {
  await page.goto(`/producto/${opts.slug}`);
  if (opts.color) {
    await page
      .getByRole("group", { name: "Color" })
      .getByRole("button", { name: opts.color, exact: true })
      .click();
  }
  if (opts.size) {
    await page
      .getByRole("group", { name: "Talle" })
      .getByRole("button", { name: opts.size, exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/carrito");
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

test.describe("caso 1 — listado de /tienda y filtro por talle", () => {
  test("lista los 12 productos, ?talle= reduce el resultado y el panel de filtros atrapa el foco", async ({
    page,
  }) => {
    await page.goto("/tienda");
    // El contador de productos ("N productos") es el <p> inmediatamente
    // después del H1 (src/components/catalog/product-list-view.tsx) — se
    // ancla ahí en vez de por texto suelto porque en algún refresco de
    // streaming llegamos a ver un segundo nodo transitorio con el mismo
    // texto en el DOM (no en el árbol de accesibilidad) antes de asentarse.
    const heading = page.getByRole("heading", { name: "Tienda", level: 1 });
    await expect(heading).toBeVisible();
    const productCount = heading.locator("xpath=following-sibling::p[1]");
    await expect(productCount).toHaveText("12 productos");
    await expect(page.locator('a[href^="/producto/"]')).toHaveCount(12);

    // XL aparece en exactamente 3 de los 12 productos demo (ver prisma/seed.ts):
    // demo-top-escote-v, demo-buzo-oversize-friza, demo-campera-denim.
    await page.goto("/tienda?talle=XL");
    await expect(productCount).toHaveText("3 productos");
    await expect(page.getByText("Talle XL")).toBeVisible();

    await page.goto("/tienda");
    const filterButton = page.getByRole("button", {
      name: "Filtrar",
      exact: true,
    });
    await filterButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Foco atrapado: tabulamos de verdad (nunca `.focus()`) y confirmamos que
    // el foco nunca sale del panel.
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const contained = await dialog.evaluate((el) =>
        el.contains(document.activeElement),
      );
      expect(contained).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(filterButton).toBeFocused();
  });
});

test.describe("caso 2 — PDP multi-variante", () => {
  test("sin selección el CTA está deshabilitado, el talle sin stock se ve tachado y agregar abre el drawer", async ({
    page,
  }) => {
    await page.goto("/producto/demo-remera-basica-algodon");

    const cta = page.getByRole("button", { name: "Elegí un color." });
    await expect(cta).toBeVisible();
    await expect(cta).toBeDisabled();

    await page
      .getByRole("group", { name: "Color" })
      .getByRole("button", { name: "Negro" })
      .click();

    await expect(
      page.getByRole("button", { name: "Elegí un talle." }),
    ).toBeDisabled();

    // L·Negro tiene stock 0 (ver prisma/seed.ts): tachado + "Agotado" visible
    // en el flujo del documento, sin depender de hover (src/components/catalog/size-selector.tsx).
    const sizeGroup = page.getByRole("group", { name: "Talle" });
    const sizeL = sizeGroup.getByRole("button", { name: "L", exact: true });
    await expect(sizeL).toBeDisabled();
    const textDecoration = await sizeL.evaluate(
      (el) => getComputedStyle(el).textDecorationLine,
    );
    expect(textDecoration).toContain("line-through");
    await expect(sizeL.locator("xpath=..").getByText("Agotado")).toBeVisible();

    await sizeGroup.getByRole("button", { name: "S", exact: true }).click();
    const submit = page.getByRole("button", { name: "Agregar al carrito" });
    await expect(submit).toBeEnabled();
    await submit.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Remera Básica de Algodón")).toBeVisible();
    await expect(dialog.getByText("S · Negro")).toBeVisible();
    // Radix oculta el resto del documento del árbol de accesibilidad mientras
    // el diálogo está abierto (`aria-hidden` en el contenido de fondo —
    // comportamiento correcto de un modal), así que el link del header no
    // aparece por `getByRole` en este momento: se verifica por id
    // (`#header-cart-link`, el mismo que usa `CartDrawer` para el fallback de
    // foco en src/components/cart/cart-drawer.tsx) en vez de por rol.
    await expect(page.locator("#header-cart-link")).toHaveText("Carrito (1)");
  });
});

test.describe("caso 3 — ejes de variante según producto", () => {
  test("color único no muestra el eje de color; one_size no muestra el de talle y habilita agregar directo", async ({
    page,
  }) => {
    // Color único: TODAS las variantes de este producto son "Azul" (ver
    // prisma/seed.ts) — showColor = colors.length > 1 en AddToCart da false.
    await page.goto("/producto/demo-jean-recto-clasico");
    await expect(page.getByRole("group", { name: "Color" })).toHaveCount(0);

    const sizeGroup = page.getByRole("group", { name: "Talle" });
    await expect(sizeGroup).toBeVisible();
    await sizeGroup.getByRole("button", { name: "38", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeEnabled();

    // one_size: sin eje de talle (showSize = sizeSystem !== "one_size" da
    // false) — solo hace falta elegir color para habilitar el CTA, sin un
    // paso de talle intermedio.
    await page.goto("/producto/demo-cinturon-cuero");
    await expect(page.getByRole("group", { name: "Talle" })).toHaveCount(0);

    const colorGroup = page.getByRole("group", { name: "Color" });
    await expect(colorGroup).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Elegí un color." }),
    ).toBeDisabled();

    await colorGroup.getByRole("button", { name: "Negro" }).click();
    await expect(
      page.getByRole("button", { name: "Agregar al carrito" }),
    ).toBeEnabled();
    // No se clickea acá: lo que este caso verifica es que el CTA quede listo
    // sin pasar por un eje de talle — el flujo de agregar en sí ya lo prueban
    // los casos 2 y 5.
  });
});

test.describe("caso 4 — /carrito con stock limitado", () => {
  test("el stepper no supera el stock, la línea coincide con el total y quitar vacía el carrito", async ({
    page,
  }) => {
    // XL·Negro tiene stock 3 (ver prisma/seed.ts) — el stepper nunca deja
    // pedir más que eso.
    await addVariantAndGoToCart(page, {
      slug: "demo-buzo-oversize-friza",
      color: "Negro",
      size: "XL",
    });

    await expect(
      page.getByRole("heading", { name: "Tu carrito (1)" }),
    ).toBeVisible();

    const qtyGroup = page.getByRole("group", { name: "Cantidad" });
    const increment = qtyGroup.getByRole("button", { name: "Sumar" });
    // basePrice 26.500 (sin priceOverride) — formatPrice de src/lib/money.ts
    // (entero, sin decimales). El contador del stepper es optimista
    // (client-side), pero el total de la línea depende del round-trip al
    // server (`updateCartItemAction` + `router.refresh()`): esperamos que
    // cada total se refleje antes del siguiente click para no solaparlos.
    const lineTotal = qtyGroup.locator("xpath=following-sibling::span[1]");
    await increment.click(); // 1 -> 2
    await expect(lineTotal).toHaveText("$ 53.000");
    await increment.click(); // 2 -> 3
    await expect(lineTotal).toHaveText("$ 79.500");
    await expect(qtyGroup.getByText("3", { exact: true })).toBeVisible();
    await expect(increment).toBeDisabled();

    const summaryTotal = page
      .getByText("Total", { exact: true })
      .locator("xpath=following-sibling::dd[1]");
    await expect(summaryTotal).toHaveText("$ 79.500");

    await page.getByRole("button", { name: "Quitar del carrito" }).click();
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  });
});

test.describe("caso 5 — drawer del carrito por teclado", () => {
  test("Enter sobre 'Agregar al carrito' abre el drawer y Escape devuelve el foco al botón", async ({
    page,
  }) => {
    // Regresión del foco (2026-09-24): el CTA se deshabilita mientras la acción
    // está pendiente y Chrome le saca el foco a un botón `disabled`, así que
    // `openCart()` guardaba `<body>` como destino y al cerrar el foco caía ahí.
    // Ahora el CTA se pasa explícito (`openCart(trigger)`).

    await page.goto("/producto/demo-remera-basica-algodon");
    await page
      .getByRole("group", { name: "Color" })
      .getByRole("button", { name: "Negro" })
      .click();
    await page
      .getByRole("group", { name: "Talle" })
      .getByRole("button", { name: "S", exact: true })
      .click();

    const addButton = page.getByRole("button", { name: "Agregar al carrito" });
    // Tabulamos de verdad hasta enfocar el botón (nunca `.focus()`
    // programático) — mismo patrón que tests/e2e/storefront-shell.spec.ts.
    for (let i = 0; i < 10; i++) {
      if (await addButton.evaluate((el) => el === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(addButton).toBeFocused();

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(addButton).toBeFocused();
  });
});

test.describe("caso 6 — accesibilidad (axe) del recorrido de compra", () => {
  test.describe("desktop", () => {
    test("tienda", async ({ page }) => {
      await page.goto("/tienda");
      await expect(
        page.getByRole("heading", { name: "Tienda", level: 1 }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("PDP", async ({ page }) => {
      await page.goto("/producto/demo-remera-basica-algodon");
      await expect(
        page.getByRole("heading", { name: "Remera Básica de Algodón" }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("carrito con un ítem", async ({ page }) => {
      await addVariantAndGoToCart(page, {
        slug: "demo-cinturon-cuero",
        color: "Negro",
      });
      await expect(
        page.getByRole("heading", { name: "Tu carrito (1)" }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });

  test.describe("mobile (375×812)", () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

    test("tienda", async ({ page }) => {
      await page.goto("/tienda");
      await expect(
        page.getByRole("heading", { name: "Tienda", level: 1 }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("PDP", async ({ page }) => {
      await page.goto("/producto/demo-remera-basica-algodon");
      await expect(
        page.getByRole("heading", { name: "Remera Básica de Algodón" }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("carrito con un ítem", async ({ page }) => {
      await addVariantAndGoToCart(page, {
        slug: "demo-cinturon-cuero",
        color: "Negro",
      });
      await expect(
        page.getByRole("heading", { name: "Tu carrito (1)" }),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
});
