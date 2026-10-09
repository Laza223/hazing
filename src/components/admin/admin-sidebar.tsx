"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  FolderTree,
  Ticket,
  ShoppingCart,
  Star,
  RotateCcw,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
  { href: "/admin/cupones", label: "Cupones", icon: Ticket },
  { href: "/admin/resenas", label: "Reseñas", icon: Star },
  {
    href: "/admin/arrepentimiento",
    label: "Arrepentimientos",
    icon: RotateCcw,
  },
  { href: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * AdminSidebar — barra lateral fija en desktop (`md:`), menú horizontal
 * scrollable fijo abajo en mobile (docs/spec/07-admin.md §3.2). Sin
 * gradientes ni sombras: activo = fondo `ink`/texto `paper`.
 */
export function AdminSidebar({
  email,
  logout,
}: {
  email?: string;
  logout?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper md:flex">
        <div className="border-b border-line px-5 py-6">
          <Link
            href="/admin"
            className="inline-block outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Wordmark className="h-5 w-auto text-ink" />
          </Link>
        </div>

        <nav aria-label="Navegación del panel" className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm font-medium outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                      active
                        ? "bg-ink text-paper"
                        : "text-ink-2 hover:bg-paper-2",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {logout ? (
          <div className="border-t border-line p-3">
            {email ? (
              <p
                className="mb-2 truncate px-1 text-xs text-ink-4"
                title={email}
              >
                {email}
              </p>
            ) : null}
            {logout}
          </div>
        ) : null}
      </aside>

      {/* Mobile: menú horizontal fijo abajo (Dana carga desde el celular). */}
      <nav
        aria-label="Navegación del panel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper md:hidden"
      >
        <ul className="flex items-center justify-between overflow-x-auto px-1 py-1">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-[64px] shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    active ? "text-ink" : "text-ink-4",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="max-w-[62px] truncate text-center">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
