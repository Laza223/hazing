// Módulo puro (sin prisma): lo importa también el form del admin, que es client.

/**
 * Empresas con las que despacha la dueña. El link es la página oficial de seguimiento:
 * ninguna tiene un link público con el código adentro (Correo Argentino pide captcha),
 * así que la clienta pega el código que le llega en el mail.
 */
export const CARRIERS = [
  {
    name: "Vía Cargo",
    trackingUrl: "https://viacargo.com.ar/seguimiento-de-envio/",
  },
  { name: "Andreani", trackingUrl: "https://www.andreani.com/" },
  {
    name: "OCA",
    trackingUrl: "https://www.oca.com.ar/Busquedas/Seguimientos",
  },
  {
    name: "Correo Argentino",
    trackingUrl: "https://www.correoargentino.com.ar/seguimiento-de-envios",
  },
] as const;
