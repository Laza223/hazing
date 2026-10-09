import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import type { CartLine } from "@/lib/cart/types";
import type { CheckoutLineInput } from "@/lib/orders/checkout-service";

/** Include estándar para cargar un carrito con todo lo necesario para calcular líneas. */
export const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              category: true,
              categories: { include: { category: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: typeof CART_INCLUDE;
}>;
export type CartItemWithRefs = CartWithItems["items"][number];

/** Ids de categoría con los que un cupón de categoría puede matchear un producto:
 *  primaria, secundarias y el padre de cada una (jerarquía de 2 niveles). */
function productCategoryIds(product: CartItemWithRefs["variant"]["product"]) {
  const ids = new Set<string>([product.categoryId]);
  if (product.category?.parentId) ids.add(product.category.parentId);
  for (const link of product.categories ?? []) {
    ids.add(link.categoryId);
    if (link.category?.parentId) ids.add(link.category.parentId);
  }
  return [...ids];
}

/** Mapea un CartItem (con includes) a una CartLine pura para cálculos. */
export function cartItemToCartLine(item: CartItemWithRefs): CartLine {
  const v = item.variant;
  return {
    id: item.id,
    kind: "variant",
    refId: v.id,
    unitPrice: getEffectivePrice(v.product, v),
    qty: item.qty,
    productId: v.product.id,
    categoryId: v.product.categoryId,
    categoryIds: productCategoryIds(v.product),
  };
}

export interface LoadedCart {
  cart: CartWithItems | null;
  lines: CartLine[];
}

/** Carga un carrito por id con sus líneas mapeadas. */
export async function loadCart(cartId: string | null): Promise<LoadedCart> {
  if (!cartId) return { cart: null, lines: [] };
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: CART_INCLUDE,
  });
  if (!cart || cart.status !== "active") return { cart: null, lines: [] };
  return { cart, lines: cart.items.map(cartItemToCartLine) };
}

/** Crea un carrito activo y devuelve su id. */
export async function createCart(): Promise<string> {
  const cart = await prisma.cart.create({
    data: { sessionId: crypto.randomUUID(), status: "active" },
  });
  return cart.id;
}

export interface AddItemInput {
  cartId: string;
  variantId: string;
  qty: number;
}

/** Resultado de `addItem`/`updateItem`: `notice` es un aviso NO bloqueante (ej. "Solo
 *  quedan N.") para cuando la cantidad pedida se clampeó al stock disponible. */
export interface CartMutationResult {
  notice?: string;
}

/** Agrega (o incrementa) una línea. Calcula el snapshot de precio en el server. Una línea
 *  nunca supera el `stock` de su variante: sin stock tira error; si la cantidad pedida (sumada
 *  a la ya existente) lo supera, clampea a `stock` y devuelve un aviso en vez de tirar error. */
export async function addItem(
  input: AddItemInput,
): Promise<CartMutationResult> {
  const qty = Math.max(1, Math.floor(input.qty));
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: true },
  });
  if (!variant || !variant.active) throw new Error("Variante no disponible.");
  if (variant.stock <= 0) throw new Error("Sin stock en esa variante.");
  const unit = getEffectivePrice(variant.product, variant);
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: input.cartId, variantId: input.variantId },
  });
  const desired = (existing?.qty ?? 0) + qty;
  const finalQty = Math.min(desired, variant.stock);
  const notice = finalQty < desired ? `Solo quedan ${finalQty}.` : undefined;

  // upsert sobre @@unique([cartId, variantId]): si otro request creó la línea entre el
  // findFirst y acá, se actualiza en vez de duplicarla.
  await prisma.cartItem.upsert({
    where: {
      cartId_variantId: { cartId: input.cartId, variantId: input.variantId },
    },
    update: { qty: finalQty },
    create: {
      cartId: input.cartId,
      variantId: input.variantId,
      qty: finalQty,
      unitPriceSnapshot: unit,
    },
  });
  return notice ? { notice } : {};
}

/** Actualiza la cantidad de una línea (0 o menos → elimina). Scopeada a `cartId`: un itemId que no
 *  pertenece a ese carrito no matchea (evita que una clienta toque el carrito de otra por id).
 *  Igual que `addItem`, la cantidad nunca supera el `stock` de la variante: se clampea con un
 *  aviso en vez de tirar error. */
export async function updateItem(
  cartId: string,
  itemId: string,
  qty: number,
): Promise<CartMutationResult> {
  if (qty <= 0) {
    await removeItem(cartId, itemId);
    return {};
  }
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: { variant: true },
  });
  if (!item) throw new Error("Esa línea no pertenece a este carrito.");

  const requested = Math.floor(qty);
  if (item.variant.stock <= 0) {
    await removeItem(cartId, itemId);
    return { notice: "Sin stock en esa variante." };
  }
  const finalQty = Math.min(requested, item.variant.stock);
  await prisma.cartItem.updateMany({
    where: { id: itemId, cartId },
    data: { qty: finalQty },
  });
  return finalQty < requested ? { notice: `Solo quedan ${finalQty}.` } : {};
}

/** Elimina una línea. Scopeada a `cartId` (mismo motivo que `updateItem`). */
export async function removeItem(
  cartId: string,
  itemId: string,
): Promise<void> {
  const res = await prisma.cartItem.deleteMany({
    where: { id: itemId, cartId },
  });
  if (res.count === 0)
    throw new Error("Esa línea no pertenece a este carrito.");
}

/** Mapea un carrito cargado a las líneas de checkout (con snapshots y título para MP). */
export function cartToCheckoutLines(cart: CartWithItems): CheckoutLineInput[] {
  return cart.items.map((item) => {
    const line = cartItemToCartLine(item);
    const v = item.variant;
    return {
      line,
      productNameSnapshot: v.product.name,
      variantNameSnapshot: v.name,
      skuSnapshot: v.sku,
      title: `${v.product.name} — ${v.name}`,
    };
  });
}

/** Carga el carrito de la sesión actual (cookie) con sus líneas. */
export async function loadCurrentCart(): Promise<
  LoadedCart & { cartId: string | null }
> {
  const { getCartIdFromCookie } = await import("@/lib/cart/cart-cookie");
  const cartId = await getCartIdFromCookie();
  const loaded = await loadCart(cartId);
  return { ...loaded, cartId: loaded.cart ? cartId : null };
}
