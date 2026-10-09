"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import gsap from "gsap";
import { ArrowLeft } from "lucide-react";

import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { lineDraw } from "@/lib/motion/primitives";
import type { CategoryNode } from "@/lib/catalog/categories";
import {
  MENU_BRAND_BLURB,
  SOCIAL_INSTAGRAM_HANDLE,
  SOCIAL_INSTAGRAM_URL,
} from "@/lib/content/copy";

// `preview`: foto de campaña que se ve a la derecha al pasar por el ítem
// (desktop). "Productos" no es un link: abre el listado de categorías, que
// sale de la base (lo que Dana carga en el admin), no de una lista fija.
const NAV_ITEMS = [
  {
    number: "01",
    label: "Nuevo",
    href: "/tienda?orden=novedades",
    preview: "/images/campaign/look-05.webp",
  },
  {
    number: "02",
    label: "Productos",
    href: null,
    preview: "/images/campaign/look-03.webp",
  },
  {
    number: "03",
    label: "Contacto",
    href: "/contacto",
    preview: "/images/campaign/look-06.webp",
  },
] as const;

const PRODUCTS_PREVIEW = "/images/campaign/look-03.webp";

// `min-h-14` (56px): el §9 lo pide explícito para los ítems del menú en
// mobile, donde la caja del texto sola no llega al target táctil.
const ITEM_CLASS =
  "flex min-h-14 w-full items-baseline gap-4 py-1 text-left text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink group-hover/nav:text-ink-3 group-hover/nav:hover:text-ink group-hover/nav:focus-visible:text-ink";
const ITEM_LABEL_CLASS =
  "tracking-caps-lg font-display uppercase leading-none transition-transform duration-ui ease-ui group-hover/nav:hover:translate-x-2 group-hover/nav:focus-visible:translate-x-2";
const PRODUCT_LABEL_STYLE = {
  fontSize: "clamp(1.375rem, min(5vw, 8svh), 5rem)",
  fontVariationSettings: '"wdth" 110',
} as const;

export interface FullscreenMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categorías visibles en el menú (raíces con sus subcategorías). */
  categories: CategoryNode[];
}

type MenuView = "main" | "products";

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
export function FullscreenMenu({
  open,
  onOpenChange,
  categories,
}: FullscreenMenuProps) {
  const [view, setView] = useState<MenuView>("main");
  const [mounted, setMounted] = useState(open);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const hovered =
    NAV_ITEMS.find((item) => item.label === hoveredItem) ?? NAV_ITEMS[0];
  const previewSrc = view === "products" ? PRODUCTS_PREVIEW : hovered.preview;
  const contentRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // `lineDraw` sobre la regla del pie del menú — la cuarta primitiva del §8
  // ("scaleX 0 → 1 en reglas"), que hasta la sub-fase 5.4 estaba declarada en
  // la spec pero sin implementación ni uso en todo el repo.
  useEffect(() => {
    const rule = ruleRef.current;
    if (!open || !mounted || !rule || reducedMotion) return;
    const tween = lineDraw(rule, { delay: DURATION.overlay });
    tween.play();
    return () => {
      tween.kill();
      gsap.set(rule, { clearProps: "all" });
    };
  }, [open, mounted, reducedMotion]);

  // Al cerrar el menú vuelve a la vista principal.
  useEffect(() => {
    if (!mounted) setView("main");
  }, [mounted]);

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

          <Dialog.Close className="tracking-caps-sm absolute right-6 top-8 inline-flex min-h-11 items-center text-xs uppercase text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:right-12">
            Cerrar
          </Dialog.Close>

          <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            {view === "main" ? (
              <nav aria-label="Navegación principal" className="group/nav">
                <ul className="flex flex-col gap-2">
                  {NAV_ITEMS.map((item) => {
                    const content = (
                      <>
                        <span className="tracking-caps-sm text-xs text-ink-4">
                          {item.number}
                        </span>
                        <span
                          className={ITEM_LABEL_CLASS}
                          style={{
                            fontSize: "clamp(1.75rem, min(6.5vw, 13svh), 8rem)",
                            fontVariationSettings: '"wdth" 110',
                          }}
                        >
                          {item.label}
                        </span>
                      </>
                    );
                    const hoverProps = {
                      onMouseEnter: () => setHoveredItem(item.label),
                      onMouseLeave: () => setHoveredItem(null),
                      onFocus: () => setHoveredItem(item.label),
                      onBlur: () => setHoveredItem(null),
                      className: ITEM_CLASS,
                    };
                    return (
                      <li key={item.label}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => onOpenChange(false)}
                            {...hoverProps}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            aria-expanded={false}
                            onClick={() => setView("products")}
                            {...hoverProps}
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ) : (
              <nav aria-label="Productos" className="group/nav">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="tracking-caps-sm mb-4 inline-flex min-h-11 items-center gap-2 text-xs uppercase text-ink-2 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Volver
                </button>
                <ul className="flex flex-col gap-1">
                  <li>
                    <Link
                      href="/tienda"
                      onClick={() => onOpenChange(false)}
                      className={ITEM_CLASS}
                    >
                      <span
                        className={ITEM_LABEL_CLASS}
                        style={PRODUCT_LABEL_STYLE}
                      >
                        Ver todo
                      </span>
                    </Link>
                  </li>
                  {categories.map((root) => (
                    <li key={root.id}>
                      <Link
                        href={`/tienda/${root.slug}`}
                        onClick={() => onOpenChange(false)}
                        className={ITEM_CLASS}
                      >
                        <span
                          className={ITEM_LABEL_CLASS}
                          style={PRODUCT_LABEL_STYLE}
                        >
                          {root.name}
                        </span>
                      </Link>
                      {root.children.length > 0 && (
                        <ul className="tracking-caps-sm flex flex-wrap gap-x-5 pb-2 pl-1 text-xs uppercase">
                          {root.children.map((child) => (
                            <li key={child.id}>
                              <Link
                                href={`/tienda/${root.slug}/${child.slug}`}
                                onClick={() => onOpenChange(false)}
                                className="inline-flex min-h-11 items-center text-ink-2 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className="hidden lg:flex lg:items-center lg:justify-center">
              <div className="relative aspect-[3/4] h-[min(68svh,40rem)] max-w-full overflow-hidden bg-paper-2">
                {previewSrc ? (
                  <Image
                    key={previewSrc}
                    src={previewSrc}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="28rem"
                    className="object-cover"
                  />
                ) : (
                  <p className="flex h-full items-center p-8 text-sm leading-relaxed text-ink-2">
                    {MENU_BRAND_BLURB}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="tracking-caps-sm flex flex-wrap items-center gap-6 pt-6 text-xs uppercase text-ink-2">
            {/* Regla dibujada con la primitiva lineDraw (§8) — por eso es un
                nodo propio con transform, no un border-t del contenedor. */}
            <div
              ref={ruleRef}
              aria-hidden="true"
              className="absolute inset-x-6 h-px bg-line md:inset-x-12"
              style={{ marginTop: "-1.5rem" }}
            />
            <Link
              href="/cuenta"
              onClick={() => onOpenChange(false)}
              className="inline-flex min-h-11 items-center outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Cuenta
            </Link>
            <Link
              href="/carrito"
              onClick={() => onOpenChange(false)}
              className="inline-flex min-h-11 items-center outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Carrito
            </Link>
            <a
              href={SOCIAL_INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Instagram — @{SOCIAL_INSTAGRAM_HANDLE}
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
