"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { FullscreenMenu } from "@/components/layout/fullscreen-menu";
import { Wordmark } from "@/components/brand/wordmark";
import { useCartUI } from "@/components/cart/cart-provider";

/**
 * Header — sticky (docs/spec/05-direccion-arte.md §3.2, §5).
 *
 * Sobre el hero (§4 beat 2) va con `mix-blend-mode: difference` y sin fondo:
 * así se lee sobre cualquier foto sin necesidad de una banda blanca encima
 * de la imagen. Cuando el hero deja de estar debajo del header, vuelve al
 * fondo `paper` sólido con su borde.
 *
 * El acoplamiento con la home es por atributo (`[data-hero-section]`, ver
 * src/components/home/hero.tsx): el header vive en el layout del grupo de
 * ruta y se monta en rutas que no tienen hero, donde este efecto no
 * encuentra nada y el header queda sólido, que es lo correcto.
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const { cartCount } = useCartUI();

  useEffect(() => {
    const hero = document.querySelector("[data-hero-section]");
    if (!hero) return;

    // El header mide 64px (h-16): recortando ese alto del root, el hero deja
    // de "intersecar" justo cuando termina de pasar por detrás del header.
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setOverHero(entry.isIntersecting);
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <header
        // data-mix-blend-difference: axe-core no evalúa `mix-blend-mode` y
        // reporta un falso positivo de contraste (dequelabs/axe-core#1029).
        // El E2E excluye SOLO los nodos con este atributo, no la regla.
        data-mix-blend-difference={overHero ? "" : undefined}
        className={cn(
          "sticky top-0 z-40 flex h-16 items-center justify-between px-4 transition-colors duration-ui ease-ui md:px-10",
          overHero
            ? "border-b border-transparent bg-transparent text-paper mix-blend-difference"
            : "border-b border-line bg-paper text-ink",
        )}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          // Sin color propio: hereda el del header (ink normal, paper sobre el
          // hero). El outline de foco usa `outline-current` por lo mismo —
          // con `outline-ink` fijo sería invisible en el modo invertido.
          className="flex min-h-11 items-center gap-2 outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="tracking-caps-sm text-xs font-medium uppercase">
            Menú
          </span>
        </button>

        <Link
          href="/"
          aria-label="Hazing"
          className="absolute left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {/* `text-current` pisa el `text-ink` por defecto del Wordmark para
              que herede el color del header (invertido sobre el hero). */}
          <Wordmark className="h-6 w-auto text-current" />
        </Link>

        <div className="flex items-center gap-5">
          {/* Solo desde md: a 375px choca con el wordmark centrado. En mobile
              "Cuenta" vive en el menú fullscreen. */}
          <Link
            href="/cuenta"
            className="tracking-caps-sm hidden min-h-11 items-center text-xs font-medium uppercase outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current md:inline-flex"
          >
            Cuenta
          </Link>
          <Link
            id="header-cart-link"
            href="/carrito"
            className="tracking-caps-sm inline-flex min-h-11 items-center text-xs font-medium uppercase outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Carrito ({cartCount})
          </Link>
        </div>
      </header>

      <FullscreenMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
