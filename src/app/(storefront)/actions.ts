"use server";

import { publicErrorMessage } from "@/lib/prisma-errors";

import { unavailableLines } from "@/lib/cart/availability";
import { revalidatePath } from "next/cache";
import {
  loadCart,
  loadCurrentCart,
  createCart,
  addItem,
  updateItem,
  removeItem,
  cartToCheckoutLines,
} from "@/lib/cart/cart-service";
import {
  getCartIdFromCookie,
  setCartIdCookie,
  getCouponCodeFromCookie,
  setCouponCodeCookie,
} from "@/lib/cart/cart-cookie";
import { cartSubtotal } from "@/lib/cart/totals";
import { validateCoupon, applyCoupon } from "@/lib/coupons/apply";
import { toNumber } from "@/lib/catalog/pricing";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/customer/auth";
import { quoteShipping } from "@/lib/shipping/quote";
import { enforceRateLimit } from "@/lib/rate-limit";
import { shippingQuoteDeps } from "@/lib/orders/checkout-data";
import {
  createCheckout,
  defaultCheckoutDeps,
} from "@/lib/orders/checkout-service";
import {
  validateCheckoutForm,
  isShippingMethod,
  SHIPPING_METHODS,
  type CheckoutFormInput,
  type CheckoutShippingMethod,
} from "@/lib/orders/checkout-validation";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

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
      error: publicErrorMessage(e, "No se pudo agregar al carrito."),
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
      error: publicErrorMessage(e, "No se pudo actualizar el carrito."),
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
      error: publicErrorMessage(e, "No se pudo quitar del carrito."),
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
      error: publicErrorMessage(e, "No se pudo actualizar la cantidad."),
    };
  }
}

export async function applyCouponAction(code: string): Promise<ActionResult> {
  const limited = await enforceRateLimit("coupon");
  if (limited) return limited;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Ingresá un código." };
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalized },
  });
  if (!coupon) return { ok: false, error: "Cupón inexistente." };
  const cartId = await getCartIdFromCookie();
  const { lines } = await loadCart(cartId);
  const subtotal = cartSubtotal(lines);
  // Límite de uso por clienta: con sesión, cuenta los canjes previos de
  // CouponRedemption; invitada sigue sin historial (0).
  const customer = await getCustomer();
  const customerRedemptions = customer
    ? ((
        await prisma.couponRedemption.findUnique({
          where: {
            customerId_couponId: {
              customerId: customer.id,
              couponId: coupon.id,
            },
          },
          select: { redeemedCount: true },
        })
      )?.redeemedCount ?? 0)
    : 0;
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

export interface ShippingOption {
  cost: number;
  free: boolean;
}
export interface QuoteShippingResult extends ActionResult {
  /** Una opción por método; `null` = sin cotización (el método no se puede pagar). */
  options?: Record<CheckoutShippingMethod, ShippingOption | null>;
}

/** Cotiza los 3 métodos de entrega de una vez. Cambiar el CP invalida la cotización
 *  anterior: el form vuelve a llamar a esta action. El costo real se recalcula en
 *  `createCheckoutAction`; esto es informativo. */
export async function quoteShippingAction(input: {
  cp: string;
  province?: string | null;
}): Promise<QuoteShippingResult> {
  if (!/^\d{4}$/.test(input.cp))
    return { ok: false, error: "Código postal inválido (4 dígitos)." };
  const limited = await enforceRateLimit("quote");
  if (limited) return { ok: false, error: limited.error };
  const { lines } = await loadCurrentCart();
  if (lines.length === 0) return { ok: false, error: "El carrito está vacío." };
  const subtotal = cartSubtotal(lines);
  const units = lines.reduce((n, l) => n + l.qty, 0);
  const entries = await Promise.all(
    SHIPPING_METHODS.map(async (method) => {
      try {
        const q = await quoteShipping(
          {
            method,
            cp: input.cp,
            province: input.province ?? null,
            subtotal,
            units,
          },
          shippingQuoteDeps,
        );
        return [method, { cost: q.cost, free: q.cost === 0 }] as const;
      } catch {
        return [method, null] as const;
      }
    }),
  );
  const options = Object.fromEntries(entries) as Record<
    CheckoutShippingMethod,
    ShippingOption | null
  >;
  if (!options.domicilio && !options.sucursal) {
    // Sin cotización ni respaldo — docs/spec/08-checkout.md §3, punto 3. El retiro sigue disponible.
    return {
      ok: true,
      options,
      error:
        "Todavía no tenemos costo de envío para ese código postal. Escribinos y lo resolvemos.",
    };
  }
  return { ok: true, options };
}

export interface CheckoutResult extends ActionResult {
  initPoint?: string;
  orderNumber?: string;
}

/** Crea el pedido y la preference de MP. Revalida TODO en el server — el form del cliente
 *  solo da feedback inmediato, nunca es la fuente de verdad (docs/spec/08-checkout.md §3.7). */
export async function createCheckoutAction(input: {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingMethod: CheckoutShippingMethod;
  address: {
    cp: string;
    province: string;
    street: string;
    number: string;
    floorApt?: string | null;
    city: string;
    notes?: string | null;
  };
  acceptedTerms: boolean;
}): Promise<CheckoutResult> {
  const limited = await enforceRateLimit("checkout");
  if (limited) return limited;
  if (!isShippingMethod(input.shippingMethod))
    return { ok: false, error: "Elegí una forma de entrega." };
  const formInput: CheckoutFormInput = {
    shippingMethod: input.shippingMethod,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    province: input.address.province,
    cp: input.address.cp,
    city: input.address.city,
    street: input.address.street,
    number: input.address.number,
    floorApt: input.address.floorApt ?? "",
    notes: input.address.notes ?? "",
    acceptedTerms: input.acceptedTerms,
  };
  const validationError = validateCheckoutForm(formInput);
  if (validationError) return { ok: false, error: validationError };

  try {
    const { cart, cartId } = await loadCurrentCart();
    if (!cart || cart.items.length === 0)
      return { ok: false, error: "Tu carrito está vacío." };
    if (unavailableLines(cart.items).length > 0)
      return {
        ok: false,
        error:
          "Algunas prendas de tu carrito ya no están disponibles o quedan menos unidades. Revisá tu carrito antes de pagar.",
      };
    const lines = cartToCheckoutLines(cart);
    const couponCode = await getCouponCodeFromCookie();
    // Asociar el pedido a la clienta logueada (historial en /cuenta/pedidos + límite de cupón).
    const customer = await getCustomer();
    const result = await createCheckout(
      {
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        shippingMethod: input.shippingMethod,
        address:
          input.shippingMethod === "retiro"
            ? { cp: "", province: null }
            : input.address,
        lines,
        couponCode,
        cartId,
        customerId: customer?.id ?? null,
      },
      defaultCheckoutDeps(appUrl()),
    );
    return {
      ok: true,
      initPoint: result.initPoint,
      orderNumber: result.orderNumber,
    };
  } catch (e) {
    // AbortSignal.timeout() en mercadopago.ts tira un DOMException técnico en inglés — no
    // mostrárselo a la clienta (mismo patrón que glamify).
    if (
      e instanceof DOMException &&
      (e.name === "TimeoutError" || e.name === "AbortError")
    ) {
      return {
        ok: false,
        error:
          "No pudimos conectar con Mercado Pago. Probá de nuevo en unos segundos.",
      };
    }
    return {
      ok: false,
      error: publicErrorMessage(e, "No se pudo iniciar el pago."),
    };
  }
}
