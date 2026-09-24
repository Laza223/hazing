"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { setVariantQtyAction } from "@/app/(storefront)/actions";

/**
 * Ported tal cual desde glamify-makeup/src/components/cart/cart-provider.tsx
 * (docs/spec/06-storefront.md §2): mismo contrato, sin combos (Hazing no los
 * tiene). Dueño del contador optimista del header y del estado open/closed
 * del `CartDrawer`.
 */
export interface CartItemState {
  id?: string;
  refId: string;
  productId?: string | null;
  qty: number;
}

export interface CartUI {
  open: boolean;
  /** `returnTo`: elemento al que vuelve el foco al cerrar. Hace falta cuando el
   *  disparador se deshabilita mientras la acción está pendiente: Chrome le saca
   *  el foco a un botón `disabled` y `document.activeElement` pasa a `<body>`. */
  openCart: (returnTo?: HTMLElement | null) => void;
  closeCart: () => void;
  setOpen: (v: boolean) => void;
  /** Elemento enfocado al momento de abrir el drawer — `CartDrawer` le
   *  devuelve el foco al cerrar (WCAG 2.4.3, ver docs/spec/05-direccion-arte.md §7). */
  returnFocusRef: RefObject<HTMLElement | null>;
  cartCount: number;
  getVariantQty: (variantId: string) => number;
  getProductQty: (productId: string) => number;
  setVariantQty: (
    variantId: string,
    nextQty: number,
    productId?: string | null,
  ) => Promise<boolean>;
  isUpdating: (variantId: string) => boolean;
}

const CartContext = createContext<CartUI | null>(null);

function buildItemsMap(lines?: CartItemState[]): Record<string, CartItemState> {
  const map: Record<string, CartItemState> = {};
  if (!lines) return map;
  for (const line of lines) {
    map[line.refId] = line;
  }
  return map;
}

export function CartProvider({
  children,
  initialLines = [],
  initialCount = 0,
}: {
  children: ReactNode;
  initialLines?: CartItemState[];
  initialCount?: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<Record<string, CartItemState>>(() =>
    buildItemsMap(initialLines),
  );
  const [optimisticCount, setOptimisticCount] = useState(initialCount);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  // Sincronizar cuando el servidor revalida los datos (router.refresh o navegación)
  useEffect(() => {
    setItems(buildItemsMap(initialLines));
    setOptimisticCount(initialCount);
  }, [initialLines, initialCount]);

  const getVariantQty = useCallback(
    (variantId: string): number => {
      return items[variantId]?.qty ?? 0;
    },
    [items],
  );

  const getProductQty = useCallback(
    (productId: string): number => {
      let total = 0;
      for (const key in items) {
        if (items[key]?.productId === productId) {
          total += items[key].qty;
        }
      }
      return total;
    },
    [items],
  );

  const isUpdating = useCallback(
    (variantId: string): boolean => {
      return pendingIds.has(variantId);
    },
    [pendingIds],
  );

  const setVariantQty = useCallback(
    async (
      variantId: string,
      nextQty: number,
      productId?: string | null,
    ): Promise<boolean> => {
      const clampedQty = Math.max(0, nextQty);
      const prevItem = items[variantId];
      const prevQty = prevItem?.qty ?? 0;
      if (prevQty === clampedQty) return true;

      const diff = clampedQty - prevQty;

      // Actualización optimista inmediata (0ms lag visual)
      setItems((prev) => {
        const next = { ...prev };
        if (clampedQty <= 0) {
          delete next[variantId];
        } else {
          next[variantId] = {
            id: prev[variantId]?.id,
            refId: variantId,
            productId: productId ?? prev[variantId]?.productId ?? null,
            qty: clampedQty,
          };
        }
        return next;
      });
      setOptimisticCount((prev) => Math.max(0, prev + diff));
      setPendingIds((prev) => new Set(prev).add(variantId));

      try {
        const res = await setVariantQtyAction({ variantId, qty: clampedQty });
        if (!res.ok) {
          // Revertir estado si falló el servidor
          setItems((prev) => {
            const next = { ...prev };
            if (prevQty <= 0) {
              delete next[variantId];
            } else {
              next[variantId] = {
                id: prevItem?.id,
                refId: variantId,
                productId: productId ?? prevItem?.productId ?? null,
                qty: prevQty,
              };
            }
            return next;
          });
          setOptimisticCount((prev) => Math.max(0, prev - diff));
          return false;
        }

        startTransition(() => {
          router.refresh();
        });
        return true;
      } catch {
        // Revertir ante excepción
        setItems((prev) => {
          const next = { ...prev };
          if (prevQty <= 0) {
            delete next[variantId];
          } else {
            next[variantId] = {
              id: prevItem?.id,
              refId: variantId,
              productId: productId ?? prevItem?.productId ?? null,
              qty: prevQty,
            };
          }
          return next;
        });
        setOptimisticCount((prev) => Math.max(0, prev - diff));
        return false;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(variantId);
          return next;
        });
      }
    },
    [items, router],
  );

  return (
    <CartContext.Provider
      value={{
        open,
        openCart: (returnTo) => {
          const active = document.activeElement;
          returnFocusRef.current =
            returnTo ??
            (active instanceof HTMLElement && active !== document.body
              ? active
              : null);
          setOpen(true);
        },
        closeCart: () => setOpen(false),
        setOpen,
        returnFocusRef,
        cartCount: optimisticCount,
        getVariantQty,
        getProductQty,
        setVariantQty,
        isUpdating,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartUI(): CartUI {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartUI debe usarse dentro de CartProvider");
  return ctx;
}
