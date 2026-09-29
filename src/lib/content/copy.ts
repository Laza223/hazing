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
 * Textos de las secciones de la home (src/app/(storefront)/page.tsx).
 */
export const HERO_EYEBROW = "Nueva temporada";

export const HOME_STORY = {
  eyebrow: "La marca",
  title: "Diseñada en Luján. Pensada para repetirse.",
  linkLabel: "Conocé la tienda",
} as const;

export const HOME_EDITORIAL = {
  eyebrow: "Editorial",
  title: "Lo justo, bien hecho.",
  body: "Básicos con carácter y prendas que se combinan entre sí: menos piezas, más looks.",
  linkLabel: "Ver la colección",
} as const;

export const HOME_CAMPAIGN_BAND = {
  eyebrow: "Envíos a todo el país",
  title: "Todo el lookbook, en la tienda.",
  linkLabel: "Comprar ahora",
} as const;

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
 * [BORRADOR — pendiente de la dueña: tabla de medidas real]
 * Acordeón "Guía de talles" de la PDP (docs/spec/05-direccion-arte.md §7).
 * Texto genérico y neutral: no inventa una tabla de medidas ni compromisos
 * de calce que la dueña todavía no definió.
 */
export const SIZE_GUIDE_COPY =
  "Cada prenda muestra el sistema de talles con el que está confeccionada (letras, numérico o talle único). Si tenés dudas sobre cuál te queda mejor, escribinos antes de comprar y te ayudamos a elegir.";

/**
 * Acordeón "Envíos y cambios" de la PDP (docs/spec/05-direccion-arte.md §7):
 * resumen de EXCHANGE_POLICY. Si cambia la política, cambian los dos.
 */
export const SHIPPING_AND_RETURNS_COPY =
  "Hacemos envíos a todo el país desde Luján: el costo y el plazo se calculan con tu código postal antes de confirmar la compra. Tenés 30 días desde que recibís tu pedido para cambiar talle o color, con la prenda sin uso, sin lavar y con su etiqueta. Las prendas blancas no tienen cambio, salvo falla.";

/**
 * Política de cambios de la dueña (decisión pendiente #8, resuelta el
 * 2026-09-28): prenda en las condiciones en que se entregó, con etiqueta; la
 * ropa blanca no tiene cambio. Redacción y detalles agregados en la sesión
 * principal — [A CONFIRMAR CON LA DUEÑA]: plazo de 30 días, envío del cambio a
 * cargo de la clienta, crédito si no hay stock.
 *
 * Límites legales que NO se pueden recortar con esta política: la garantía por
 * falla (Ley 24.240 art. 11, 6 meses en cosas nuevas) cubre también la ropa
 * blanca, y el derecho de arrepentimiento (art. 34) aplica a toda prenda.
 */
export const EXCHANGE_POLICY = {
  exchangeDays: 30,
  conditions: [
    "Tenés 30 días corridos desde que recibís tu pedido para pedir un cambio de talle o color.",
    "La prenda tiene que estar sin uso, sin lavar, sin perfume ni marcas, y con la etiqueta original colocada: en las mismas condiciones en que la recibiste.",
    "Las prendas blancas no tienen cambio.",
    "El cambio está sujeto a stock. Si no tenemos el talle o color que buscás, podés elegir otra prenda (abonando o recibiendo la diferencia) o te damos un crédito por lo que pagaste para usar en otra compra.",
    "El envío del cambio, de ida y de vuelta, corre por tu cuenta.",
  ],
  defects:
    "Si una prenda llegó con una falla de fabricación, la cambiamos siempre, también si es blanca, y el envío corre por nuestra cuenta. Avisanos apenas la veas, con una foto de la falla y tu número de pedido.",
} as const;

/** Momento inmersivo "La etiqueta" (docs/spec/05-direccion-arte.md §6). */
export const SIGNATURE_MOMENT_LABEL = "01 — La marca";
export const SIGNATURE_MOMENT_TAG_BACK = {
  origin: "Luján, Buenos Aires",
  sizeColorLabel: "Talle · Color",
  exampleOrderNumber: "N° HZG-000000",
} as const;
