/** Fuente única de datos del negocio para páginas legales/contenido.
 *  Datos de la titular confirmados por Lazar el 2026-09-28. Se publican SOLO en
 *  /terminos y /privacidad (la Res. 104/2005 y la Ley 25.326 exigen identificar
 *  al proveedor); no repetirlos en footer ni en otras páginas. */
export const PLACEHOLDER_PREFIX = "[COMPLETAR";

export const businessInfo = {
  legalName: "Dana Florentina Braile",
  // Sin monotributo ni razón social: se identifica con su CUIL de persona física.
  taxIdLabel: "CUIL",
  taxId: "27-45035808-3",
  address: "Luján, Buenos Aires, Argentina",
  email: "hazingfemme@gmail.com",
  // WhatsApp e Instagram se sirven desde src/lib/content/copy.ts; no duplicar acá.
  jurisdiction:
    "tribunales ordinarios correspondientes al domicilio de la parte consumidora",
  retractionDays: 10,
  paymentMethods:
    "Mercado Pago: tarjetas de crédito, débito y dinero en cuenta",
  consumerDefenseUrl:
    "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario",
} as const;

export type BusinessInfo = typeof businessInfo;
