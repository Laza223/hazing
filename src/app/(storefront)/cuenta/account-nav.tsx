"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOutAction } from "../ingresar/actions";

const LINKS = [
  { href: "/cuenta", label: "Inicio" },
  { href: "/cuenta/datos", label: "Mis datos" },
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
  { href: "/cuenta/favoritos", label: "Favoritos" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-4 text-sm">
      {LINKS.map((l) => {
        const active =
          l.href === "/cuenta"
            ? pathname === "/cuenta"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "tracking-caps-sm inline-flex min-h-11 items-center text-xs uppercase outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              active ? "text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        );
      })}
      <form action={signOutAction}>
        <button
          type="submit"
          className="tracking-caps-sm inline-flex min-h-11 items-center text-xs uppercase text-ink-3 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Salir
        </button>
      </form>
    </nav>
  );
}
