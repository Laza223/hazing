"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { useCartUI } from "@/components/cart/cart-provider";

/**
 * CartDrawer — panel lateral del carrito (docs/spec/05-direccion-arte.md §7,
 * docs/spec/06-storefront.md §3.6): Radix Dialog, entra desde la derecha en
 * 450 ms `ease-out-expo`, se separa con `line` (nunca sombra), pantalla
 * completa en mobile. Mismo patrón de "mounted + GSAP" que `FullscreenMenu`
 * (se mantiene montado durante la salida para poder animarla).
 */
export function CartDrawer({ children }: { children: ReactNode }) {
  const { open, setOpen, returnFocusRef } = useCartUI();
  const [mounted, setMounted] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const firstPath = useRef(true);

  // Cerrar el drawer al navegar (ej. "Ver carrito" → /carrito): sin esto
  // queda abierto tapando la vista nueva, sobre todo en mobile (ancho completo).
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (open && !mounted) setMounted(true);
  }, [open, mounted]);

  // Entrada.
  useEffect(() => {
    if (!open || !mounted) return;
    const node = panelRef.current;
    if (!node) return;

    if (reducedMotion) {
      gsap.fromTo(
        node,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.15, ease: EASE.ui },
      );
      return;
    }

    gsap.fromTo(
      node,
      { xPercent: 100 },
      { xPercent: 0, duration: DURATION.overlay, ease: EASE.outExpo },
    );
  }, [open, mounted, reducedMotion]);

  // Salida.
  useEffect(() => {
    if (open || !mounted) return;
    const node = panelRef.current;
    if (!node) {
      setMounted(false);
      return;
    }

    if (reducedMotion) {
      const tween = gsap.to(node, {
        autoAlpha: 0,
        duration: 0.15,
        ease: EASE.ui,
        onComplete: () => setMounted(false),
      });
      return () => {
        tween.kill();
      };
    }

    const tween = gsap.to(node, {
      xPercent: 100,
      duration: 0.35,
      ease: EASE.outExpo,
      onComplete: () => setMounted(false),
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reducedMotion]);

  if (!mounted) return null;

  return (
    <Dialog.Root open onOpenChange={(next) => !next && setOpen(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20" />
        <Dialog.Content
          ref={panelRef}
          onCloseAutoFocus={(event) => {
            // Radix nunca tuvo un `Dialog.Trigger`: el drawer se abre por `openCart()`
            // (ver `CartProvider`), así que le devolvemos el foco a mano al elemento
            // que lo tenía antes de abrir (WCAG 2.4.3) en vez del default de Radix.
            event.preventDefault();
            const target =
              returnFocusRef.current &&
              document.contains(returnFocusRef.current)
                ? returnFocusRef.current
                : document.getElementById("header-cart-link");
            target?.focus();
          }}
          className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-paper px-4 py-6 sm:max-w-md sm:px-6"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg text-ink">
              Tu carrito
            </Dialog.Title>
            <Dialog.Close className="tracking-caps-sm inline-flex min-h-11 items-center text-xs uppercase text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              Cerrar
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Resumen de tu carrito de compras
          </Dialog.Description>
          <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
