"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { FullscreenMenu } from "@/components/layout/fullscreen-menu";
import { Wordmark } from "@/components/brand/wordmark";
import { useCartUI } from "@/components/cart/cart-provider";

/**
 * Header — sticky (docs/spec/05-direccion-arte.md §3.2, §5).
 *
 * En la home, con la página arriba de todo, va transparente sobre el hero con
 * el texto en `ink` (la foto de campaña es clara; el `mix-blend-mode` que se
 * usaba antes daba un gris lavado ilegible). Apenas se scrollea vuelve al
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
  // El header vive en el layout y no se remonta al navegar: se vuelve a
  // buscar el hero en cada cambio de ruta.
  const pathname = usePathname();

  useEffect(() => {
    const hero = document.querySelector("[data-hero-section]");
    if (!hero) {
      setOverHero(false);
      return;
    }

    // Transparente solo con la página arriba de todo: apenas se scrollea, el
    // statement del hero pasa por debajo del header y se pisarían.
    const update = () => setOverHero(window.scrollY < 8);
    update();
    // En una navegación cliente de vuelta a la home, Next puede resetear el
    // scroll después de este efecto: se vuelve a medir en el frame siguiente.
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 flex h-16 items-center justify-between px-4 transition-colors duration-ui ease-ui md:px-10",
          overHero
            ? "border-b border-transparent bg-transparent text-ink"
            : "border-b border-line bg-paper text-ink",
        )}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          // Sin color propio: hereda el del header. El outline de foco usa
          // `outline-current` por lo mismo.
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
              que herede el color del header. */}
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
