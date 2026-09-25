/** Fuente única de datos del negocio para páginas legales/contenido.
 *  Completar los [COMPLETAR] con Lazar/la dueña antes del lanzamiento. */
export const PLACEHOLDER_PREFIX = "[COMPLETAR";

export const businessInfo = {
  legalName: "[COMPLETAR: nombre y apellido de la titular]",
  // La dueña no tiene monotributo ni razón social — el CUIT/CUIL personal se
  // usa igual como identificación tributaria de persona física.
  taxId: "[COMPLETAR: CUIT/CUIL]",
  address: "Luján, Buenos Aires, Argentina",
  email: "[COMPLETAR: email de contacto]",
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
