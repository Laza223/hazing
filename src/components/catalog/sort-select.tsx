"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "relevancia", label: "Relevancia" },
  { value: "novedades", label: "Novedades" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
] as const;

/**
 * SortSelect — `<select>` nativo estilado como botón de texto, sin JS extra
 * (docs/spec/06-storefront.md §3.4). El estado vive en la URL (`?orden=`).
 * Nota: donde glamify trackea un evento de analítica al cambiar el orden,
 * no hay llamada — PostHog está pendiente (§2 del contrato de esta fase).
 */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("orden") ?? "relevancia";

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("orden", event.target.value);
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="tracking-caps-sm inline-flex min-h-11 items-center gap-2 text-xs uppercase text-ink">
      <label htmlFor="catalog-sort" className="text-ink-3">
        Ordenar
      </label>
      <select
        id="catalog-sort"
        value={current}
        onChange={onChange}
        className="min-h-11 border-0 bg-transparent text-xs uppercase tracking-[0.12em] text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
