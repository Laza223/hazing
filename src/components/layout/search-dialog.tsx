"use client";

import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * SearchDialog — lupa del header. Un `<form method="get">` a `/tienda?q=` sin
 * JS propio: la búsqueda por nombre/descripción/tags ya la resuelve
 * `parseProductListParams` + `buildProductWhere` (src/lib/catalog/filters.ts).
 */
export function SearchDialog() {
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Buscar productos"
        className="inline-flex min-h-11 items-center outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="top-0 max-w-none translate-y-0 rounded-none border-x-0 border-t-0 px-4 py-6 md:px-10">
        <DialogTitle className="tracking-caps-sm text-xs font-medium uppercase">
          Buscar
        </DialogTitle>
        <form action="/tienda" method="get" role="search" className="mt-4">
          <label htmlFor="header-search" className="sr-only">
            Nombre del producto
          </label>
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <Search
              className="h-5 w-5 shrink-0 text-ink-3"
              aria-hidden="true"
            />
            <input
              id="header-search"
              name="q"
              type="search"
              autoFocus
              required
              placeholder="¿Qué estás buscando?"
              className="min-h-11 w-full rounded-control bg-transparent text-lg text-ink outline-none placeholder:text-ink-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <button
              type="submit"
              className="tracking-caps-sm min-h-11 shrink-0 rounded-control text-xs font-medium uppercase text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Buscar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
