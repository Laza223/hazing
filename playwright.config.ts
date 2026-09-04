import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Un reintento: cubre contención de arranque en frío (build/start recién
  // levantados) sin ocultar una falla real (168/168 corridas de repro
  // dirigido en la verificación de 5.1b, ver docs/spec/05-direccion-arte.md).
  retries: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
