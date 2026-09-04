"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { FullscreenMenu } from "@/components/layout/fullscreen-menu";
import { Wordmark } from "@/components/brand/wordmark";

/**
 * Header — sticky, fondo `paper` (docs/spec/05-direccion-arte.md §3.2, §5).
 *
 * El `mix-blend-mode: difference` sobre el hero (§4 beat 2) es de la
 * sub-fase 5.2 (todavía no hay hero): no se implementa acá.
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-paper px-4 md:px-10">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex items-center gap-2 text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="tracking-caps-sm text-xs font-medium uppercase">
            Menú
          </span>
        </button>

        <Link
          href="/"
          aria-label="Hazing"
          className="absolute left-1/2 -translate-x-1/2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Wordmark className="h-6 w-auto" />
        </Link>

        <Link
          href="/carrito"
          className="tracking-caps-sm text-xs font-medium uppercase text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Carrito
        </Link>
      </header>

      <FullscreenMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
