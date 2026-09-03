// Worker entry: re-exporta el handler de @opennextjs/cloudflare.
// `scheduled` (cron triggers para carrito abandonado + expiry de pedidos) se agrega en Fase 4,
// junto con los módulos de cart/orders (patrón calcado de glamify-makeup/worker.ts).
// El artefacto .open-next/worker.js se genera con `pnpm build:worker` (no existe en dev de Next).
// @ts-ignore - generado en build
import openNextHandler from "./.open-next/worker.js";

export default {
  fetch: (openNextHandler as { fetch: ExportedHandlerFetchHandler }).fetch,
} satisfies ExportedHandler;
