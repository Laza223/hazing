"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import gsap from "gsap";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { EASE } from "@/lib/motion/tokens";
import {
  MENU_BRAND_BLURB,
  SOCIAL_INSTAGRAM_HANDLE,
  SOCIAL_INSTAGRAM_URL,
} from "@/lib/content/copy";

const NAV_ITEMS = [
  { number: "01", label: "Nuevo", href: "/" },
  { number: "02", label: "Tienda", href: "/tienda" },
  { number: "03", label: "Lookbook", href: "/lookbook" },
  { number: "04", label: "Hazing", href: "/marca" },
  { number: "05", label: "Contacto", href: "/contacto" },
] as const;

export interface FullscreenMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * FullscreenMenu — overlay fullscreen con Radix Dialog (foco atrapado, Esc,
 * `aria-modal`) y coreografía propia con GSAP (docs/spec/05-direccion-arte.md
 * §5). Sin el chrome visual default de shadcn: `Dialog.Overlay`/`Dialog.Content`
 * se estilan a mano a 100vw/100vh.
 *
 * Se mantiene montado durante la salida para poder animarla: mientras el
 * `clip-path` de cierre corre, el `Dialog.Root` sigue "abierto" (foco
 * atrapado) — recién al terminar la animación se desmonta. `open` (prop) es
 * la intención del padre; `mounted` es si el nodo sigue en el DOM (incluye
 * la salida en curso).
 */
export function FullscreenMenu({ open, onOpenChange }: FullscreenMenuProps) {
  const [mounted, setMounted] = useState(open);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Entrada: corre cuando el nodo recién se monta (open pasó a true).
  useEffect(() => {
    if (open && !mounted) {
      setMounted(true);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const node = contentRef.current;
    if (!node) return;

    if (reducedMotion) {
      gsap.fromTo(
        node,
        { opacity: 0 },
        { opacity: 1, duration: 0.15, ease: EASE.ui },
      );
      return;
    }

    gsap.fromTo(
      node,
      { clipPath: "inset(0 0 100% 0)" },
      { clipPath: "inset(0 0 0% 0)", duration: 0.45, ease: EASE.outExpo },
    );
  }, [open, mounted, reducedMotion]);

  // Salida: corre cuando `open` pasa a false mientras el nodo sigue montado.
  useEffect(() => {
    if (open || !mounted) return;
    const node = contentRef.current;
    if (!node) {
      setMounted(false);
      return;
    }

    if (reducedMotion) {
      const tween = gsap.to(node, {
        opacity: 0,
        duration: 0.15,
        ease: EASE.ui,
        onComplete: () => setMounted(false),
      });
      return () => {
        tween.kill();
      };
    }

    const tween = gsap.to(node, {
      clipPath: "inset(0 0 100% 0)",
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
    <Dialog.Root open onOpenChange={(next) => !next && onOpenChange(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-paper" />
        <Dialog.Content
          ref={contentRef}
          className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-paper px-6 py-8 md:px-12 md:py-12"
        >
          <Dialog.Title className="sr-only">Menú</Dialog.Title>
          <Dialog.Description className="sr-only">
            Navegación principal de Hazing
          </Dialog.Description>

          <Dialog.Close className="tracking-caps-sm absolute right-6 top-8 text-xs uppercase text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:right-12">
            Cerrar
          </Dialog.Close>

          <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <nav aria-label="Navegación principal" className="group/nav">
              <ul className="flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      onMouseEnter={() => setHoveredItem(item.label)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onFocus={() => setHoveredItem(item.label)}
                      onBlur={() => setHoveredItem(null)}
                      className="flex items-baseline gap-4 text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink group-hover/nav:text-ink-3 group-hover/nav:hover:text-ink group-hover/nav:focus-visible:text-ink"
                    >
                      <span className="tracking-caps-sm text-xs text-ink-4">
                        {item.number}
                      </span>
                      <span
                        className="tracking-caps-lg font-display uppercase leading-none transition-transform duration-ui ease-ui group-hover/nav:hover:translate-x-2 group-hover/nav:focus-visible:translate-x-2"
                        style={{
                          fontSize: "clamp(2.5rem, 9vw, 8rem)",
                          fontVariationSettings: '"wdth" 110',
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="hidden lg:flex lg:items-center lg:justify-center">
              <div className="relative aspect-[3/4] w-full max-w-md border border-line-2 p-6">
                {hoveredItem === "Hazing" ? (
                  <p className="flex h-full items-center text-sm leading-relaxed text-ink-2">
                    {MENU_BRAND_BLURB}
                  </p>
                ) : (
                  <p className="flex h-full items-center justify-center text-center text-xs text-ink-4">
                    A3 · preview de categoría pendiente
                  </p>
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "tracking-caps-sm flex flex-wrap items-center gap-6 border-t border-line pt-6 text-xs uppercase text-ink-2",
            )}
          >
            <Link
              href="/cuenta"
              onClick={() => onOpenChange(false)}
              className="outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Cuenta
            </Link>
            <Link
              href="/carrito"
              onClick={() => onOpenChange(false)}
              className="outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Carrito
            </Link>
            <a
              href={SOCIAL_INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Instagram — @{SOCIAL_INSTAGRAM_HANDLE}
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
