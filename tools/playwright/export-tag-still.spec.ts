import { test } from "@playwright/test";

/**
 * Exportación manual del still de "La etiqueta" (A6, docs/spec/05-direccion-arte.md
 * §12) — fuera de `testDir` (`./tests/e2e`, ver playwright.config.ts): NO lo
 * recoge `pnpm test:e2e` ni CI.
 *
 * Corrida a mano:
 *   pnpm exec playwright test tools/playwright/export-tag-still.spec.ts --headed
 *
 * Produce PNG (Playwright nativo, sin dependencias nuevas) — NO AVIF, ver
 * §7.1 del contrato de esta sub-fase (`sharp` no está en package.json,
 * REQUIERE INPUT de Lazar). El beat .65 (giro + dorso) es el más
 * representativo del objeto; ajustable vía el query param si hace falta
 * otro fotograma.
 */
test("exporta el still de la etiqueta en el beat .65 (giro + dorso)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("hazing:brand-entrance-seen", "1");
  });

  await page.goto("/?stillProgress=0.65");

  await page.evaluate(() => document.fonts.ready);
  // Un frame de render extra tras resolver fuentes/texturas.
  await page.waitForTimeout(500);

  const section = page
    .locator("section")
    .filter({ has: page.locator("canvas") });
  await section.first().screenshot({
    path: "tools/playwright/out/tag-still.png",
  });
});
