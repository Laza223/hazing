"use server";

import { revalidatePath } from "next/cache";
import {
  loadCart,
  createCart,
  addItem,
  updateItem,
  removeItem,
} from "@/lib/cart/cart-service";
import {
  getCartIdFromCookie,
  setCartIdCookie,
  setCouponCodeCookie,
} from "@/lib/cart/cart-cookie";
import { cartSubtotal } from "@/lib/cart/totals";
import { validateCoupon, applyCoupon } from "@/lib/coupons/apply";
import { toNumber } from "@/lib/catalog/pricing";
import { prisma } from "@/lib/prisma";

/** Resultado estándar de un Server Action de esta página. `notice` es un aviso NO
 *  bloqueante (ej. "Solo quedan N.") — se muestra como texto neutro, nunca rojo. */
export interface ActionResult {
  ok: boolean;
  error?: string;
  notice?: string;
}

async function ensureCartId(): Promise<string> {
  const existing = await getCartIdFromCookie();
  if (existing) {
    const cart = await prisma.cart.findUnique({
      where: { id: existing },
      select: { id: true, status: true },
    });
    if (cart && cart.status === "active") return existing;
  }
  const id = await createCart();
  await setCartIdCookie(id);
  return id;
}

export async function addToCartAction(input: {
  variantId: string;
  qty?: number;
}): Promise<ActionResult> {
  try {
    const cartId = await ensureCartId();
    const result = await addItem({
      cartId,
      variantId: input.variantId,
      qty: input.qty ?? 1,
    });
    revalidatePath("/", "layout");
    revalidatePath("/carrito");
    return { ok: true, notice: result.notice };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo agregar al carrito.",
    };
  }
}

export async function updateCartItemAction(
  itemId: string,
  qty: number,
): Promise<ActionResult> {
  try {
    const cartId = await getCartIdFromCookie();
    if (!cartId) return { ok: false, error: "No hay un carrito activo." };
    const result = await updateItem(cartId, itemId, qty);
    revalidatePath("/", "layout");
    revalidatePath("/carrito");
    return { ok: true, notice: result.notice };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo actualizar el carrito.",
    };
  }
}

export async function removeCartItemAction(
  itemId: string,
): Promise<ActionResult> {
  try {
    const cartId = await getCartIdFromCookie();
    if (!cartId) return { ok: false, error: "No hay un carrito activo." };
    await removeItem(cartId, itemId);
    revalidatePath("/", "layout");
    revalidatePath("/carrito");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo quitar del carrito.",
    };
  }
}

export async function setVariantQtyAction(input: {
  variantId: string;
  qty: number;
}): Promise<ActionResult> {
  try {
    const cartId = await ensureCartId();
    const existing = await prisma.cartItem.findFirst({
      where: { cartId, variantId: input.variantId },
      select: { id: true },
    });

    let notice: string | undefined;
    if (input.qty <= 0) {
      if (existing) {
        await removeItem(cartId, existing.id);
      }
    } else {
      if (existing) {
        notice = (await updateItem(cartId, existing.id, input.qty)).notice;
      } else {
        notice = (
          await addItem({ cartId, variantId: input.variantId, qty: input.qty })
        ).notice;
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/carrito");
    return { ok: true, notice };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo actualizar la cantidad.",
    };
  }
}

export async function applyCouponAction(code: string): Promise<ActionResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Ingresá un código." };
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalized },
  });
  if (!coupon) return { ok: false, error: "Cupón inexistente." };
  const cartId = await getCartIdFromCookie();
  const { lines } = await loadCart(cartId);
  const subtotal = cartSubtotal(lines);
  // Límite de uso por clienta: sin cuenta logueada todavía (customer/auth llega en 6.4),
  // se valida sin historial de canjes (0), igual que una compra de invitada.
  const customerRedemptions = 0;
  const validatable = {
    ...coupon,
    minSubtotal:
      coupon.minSubtotal != null ? toNumber(coupon.minSubtotal) : null,
  };
  const v = validateCoupon(validatable, {
    subtotal,
    now: new Date(),
    customerRedemptions,
  });
  if (!v.ok) return { ok: false, error: v.reason };
  // No "aplicar" un cupón con scope a producto/categoría que no rinde descuento sobre este carrito.
  const applicable = { ...coupon, value: toNumber(coupon.value) };
  const effect = applyCoupon(applicable, lines);
  if (effect.discount === 0 && !effect.freeShipping) {
    return {
      ok: false,
      error: "El cupón no aplica a los productos de tu carrito.",
    };
  }
  await setCouponCodeCookie(normalized);
  revalidatePath("/carrito");
  return { ok: true };
}

export async function removeCouponAction(): Promise<ActionResult> {
  await setCouponCodeCookie(null);
  revalidatePath("/carrito");
  return { ok: true };
}
