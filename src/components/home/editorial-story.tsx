"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";

import { cn } from "@/lib/utils";
import { DURATION, EASE, STAGGER } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";
import { ProductTile } from "@/components/catalog/product-tile";

/** Uno de los dos tiles 4:5 del look (mismo shape reducido que `NewInItem` — ver ese archivo). */
export interface EditorialLookTile {
  id: string;
  href: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  imageSrc?: string | null;
  imageSrcHover?: string | null;
  imageAlt: string;
}

export interface EditorialLook {
  id: string;
  /**
   * Foto de campaña 3:4 (asset A3, §12: verticales, lado largo ≥ 3000px).
   * `null`/`undefined` = SLOT pendiente — A3 todavía no existe (§14.2), así
   * que en la práctica esto va a estar vacío hasta el cierre de 5.2.
   */
  imageSrc?: string | null;
  imageAlt: string;
  /** Exactamente 2 — van en las columnas 8-12, desfasados verticalmente. */
  tiles: readonly [EditorialLookTile, EditorialLookTile];
  lookHref: string;
  /** Default: "Comprar el look". */
  lookLabel?: string;
}

export interface EditorialStoryProps {
  /**
   * Máximo 2 looks (regla dura del §4 beat 7: "Se repite como máximo dos
   * veces"). Si llegan más, se recortan en silencio (con `console.warn` en
   * dev) en vez de romper el layout — el integrador decide qué 2 mandar.
   */
  looks: EditorialLook[];
  className?: string;
}

const MAX_LOOKS = 2;

/**
 * EditorialStory — beat 7 del §4 (docs/spec/05-direccion-arte.md).
 *
 * Por look: foto de campaña 3:4 en las columnas 1-7 de una grilla de 12
 * (mobile: apilada, ancho completo) + dos `ProductTile` 4:5 en las columnas
 * 8-12 (el ratio 4:5 ya lo fuerza `ProductTile`, no hace falta repetirlo acá)
 * desfasados verticalmente con `mt` creciente en el segundo tile + un link de
 * texto "Comprar el look" debajo. Sin card, sin sombra (regla dura del
 * proyecto).
 *
 * Entrada: `fadeUp` (§8) por look al entrar en viewport, con un stagger
 * interno de 40ms (`STAGGER.min`) entre foto → tile 1 → tile 2 → link, una
 * sola vez (`ScrollTrigger.once`). Igual que en `NewIn`, no hay un token de
 * duración dedicado a "reveal de contenido genérico" en `tokens.ts` — se usa
 * `DURATION.image` (700ms) por ser el más cercano semánticamente a un bloque
 * liderado por fotografía, en vez de inventar un valor fuera del sistema.
 */
export function EditorialStory({ looks, className }: EditorialStoryProps) {
  if (process.env.NODE_ENV !== "production" && looks.length > MAX_LOOKS) {
    // eslint-disable-next-line no-console -- aviso de contrato en dev, no bloquea el render (ver docstring).
    console.warn(
      `EditorialStory: se esperaban como máximo ${MAX_LOOKS} looks, se recibieron ${looks.length}. Se muestran los primeros ${MAX_LOOKS}.`,
    );
  }
  const visibleLooks = looks.slice(0, MAX_LOOKS);

  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const articles = container.querySelectorAll<HTMLElement>(
      "[data-editorial-look]",
    );
    if (articles.length === 0) return;

    if (reducedMotion) {
      articles.forEach((article) => {
        const revealItems =
          article.querySelectorAll<HTMLElement>("[data-reveal-item]");
        gsap.set(revealItems, { clearProps: "opacity,transform" });
      });
      return;
    }

    ensureGsapPluginsRegistered();
    const triggers: ScrollTrigger[] = [];

    articles.forEach((article) => {
      const revealItems =
        article.querySelectorAll<HTMLElement>("[data-reveal-item]");
      if (revealItems.length === 0) return;

      gsap.set(revealItems, { opacity: 0, y: 12 });

      triggers.push(
        ScrollTrigger.create({
          trigger: article,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(revealItems, {
              opacity: 1,
              y: 0,
              duration: DURATION.image,
              ease: EASE.outExpo,
              stagger: STAGGER.min,
            });
          },
        }),
      );
    });

    return () => triggers.forEach((trigger) => trigger.kill());
  }, [visibleLooks.length, reducedMotion]);

  if (visibleLooks.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-16 px-4 py-16 md:gap-24 md:px-10 md:py-24 lg:gap-32 lg:px-16 lg:py-32",
        className,
      )}
    >
      {visibleLooks.map((look) => {
        const [tileA, tileB] = look.tiles;
        return (
          <article
            key={look.id}
            data-editorial-look
            aria-label="Look"
            className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6"
          >
            <div
              data-reveal-item
              className="relative aspect-[3/4] overflow-hidden lg:col-span-7"
            >
              {look.imageSrc ? (
                <img
                  src={look.imageSrc}
                  alt={look.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-line-2 bg-paper-2 p-4 text-center text-xs text-ink-4">
                  A3 · fotografía de campaña pendiente · vertical 3:4, lado
                  largo &ge;3000px
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 lg:col-span-5 lg:col-start-8">
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div data-reveal-item>
                  <ProductTile
                    href={tileA.href}
                    name={tileA.name}
                    price={tileA.price}
                    compareAtPrice={tileA.compareAtPrice}
                    imageSrc={tileA.imageSrc}
                    imageSrcHover={tileA.imageSrcHover}
                    imageAlt={tileA.imageAlt}
                  />
                </div>
                <div data-reveal-item className="mt-8 md:mt-12 lg:mt-16">
                  <ProductTile
                    href={tileB.href}
                    name={tileB.name}
                    price={tileB.price}
                    compareAtPrice={tileB.compareAtPrice}
                    imageSrc={tileB.imageSrc}
                    imageSrcHover={tileB.imageSrcHover}
                    imageAlt={tileB.imageAlt}
                  />
                </div>
              </div>

              <Link
                href={look.lookHref}
                data-reveal-item
                className="w-fit text-sm text-ink-2 underline underline-offset-4 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {look.lookLabel ?? "Comprar el look"}
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
