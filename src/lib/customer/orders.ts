import "server-only";

/**
 * Filtro de un pedido de la clienta: el `orderNumber` viene de la URL, así que el
 * `customerId` de la sesión va SIEMPRE en el where (sin él, cualquiera con un
 * número de pedido vería el de otra clienta).
 */
export function customerOrderWhere(orderNumber: string, customerId: string) {
  return { orderNumber, customerId };
}
