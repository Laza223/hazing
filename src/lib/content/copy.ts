/**
 * Contenido editorial de marca — un solo archivo para que la dueña (o quien
 * escriba la voz de Hazing) edite sin tocar componentes. Ver
 * docs/spec/05-direccion-arte.md §12 (assets A7/A8) y §14.
 */

/**
 * [BORRADOR — pendiente de aprobación de la dueña, ver docs/spec/05-direccion-arte.md §14.6]
 * Statement de una línea para el hero (Fase 5.2) y el cierre del momento
 * inmersivo (Fase 5.3, beat 0.65-0.90).
 */
export const BRAND_STATEMENT = "Prendas que no necesitan ruido.";

/**
 * [BORRADOR — pendiente de aprobación de la dueña]
 * Texto del ítem "04 HAZING" del menú fullscreen (docs/spec/05-direccion-arte.md §5).
 */
export const MENU_BRAND_BLURB =
  "Ropa femenina hecha en Argentina, pensada para durar más que la temporada.";

/** Confirmado por Lazar el 2026-09-04. */
export const SOCIAL_INSTAGRAM_HANDLE = "hazing.ok";
export const SOCIAL_INSTAGRAM_URL = "https://instagram.com/hazing.ok";

/** Confirmado por Lazar el 2026-09-04. */
export const CONTACT_WHATSAPP_DISPLAY = "+54 9 2323 52-9931";
/** Formato wa.me: solo dígitos, con código de país. */
export const CONTACT_WHATSAPP_URL = "https://wa.me/5492323529931";

/**
 * [BORRADOR — pendiente de definición de la dueña: política de cambios
 * (docs/spec/01-negocio.md, decisión pendiente #8) y tabla de medidas real]
 * Acordeón "Guía de talles" de la PDP (docs/spec/05-direccion-arte.md §7).
 * Texto genérico y neutral: no inventa una tabla de medidas ni compromisos
 * de calce que la dueña todavía no definió.
 */
export const SIZE_GUIDE_COPY =
  "Cada prenda muestra el sistema de talles con el que está confeccionada (letras, numérico o talle único). Si tenés dudas sobre cuál te queda mejor, escribinos antes de comprar y te ayudamos a elegir.";

/**
 * [BORRADOR — pendiente de definición de la dueña: política de cambios,
 * docs/spec/01-negocio.md decisión pendiente #8]
 * Acordeón "Envíos y cambios" de la PDP (docs/spec/05-direccion-arte.md §7).
 */
export const SHIPPING_AND_RETURNS_COPY =
  "Hacemos envíos a todo el país desde Luján. El costo y el plazo se calculan según tu código postal antes de confirmar la compra. Para cambios o devoluciones, escribinos y te contamos cómo seguir.";

/** Momento inmersivo "La etiqueta" (docs/spec/05-direccion-arte.md §6). */
export const SIGNATURE_MOMENT_LABEL = "01 — La marca";
export const SIGNATURE_MOMENT_TAG_BACK = {
  origin: "Luján, Buenos Aires",
  sizeColorLabel: "Talle · Color",
  exampleOrderNumber: "N° HZG-000000",
} as const;
