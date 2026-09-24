"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

/**
 * ActiveFilters — filtros activos como TEXTO con "×" al lado del H1, sin
 * chips redondeados (docs/spec/06-storefront.md §3.2/§3.3).
 */
export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: ActiveFilter[] = [];
  const min = searchParams.get("min");
  const max = searchParams.get("max");
  if (min) filters.push({ key: "min", value: min, label: `Desde $${min}` });
  if (max) filters.push({ key: "max", value: max, label: `Hasta $${max}` });
  if (searchParams.get("oferta") === "1") {
    filters.push({ key: "oferta", value: "1", label: "En oferta" });
  }
  if (searchParams.get("disponible") === "1") {
    filters.push({ key: "disponible", value: "1", label: "Disponible" });
  }
  for (const size of searchParams.getAll("talle")) {
    filters.push({ key: "talle", value: size, label: `Talle ${size}` });
  }
  for (const color of searchParams.getAll("color")) {
    filters.push({ key: "color", value: color, label: `Color ${color}` });
  }

  if (filters.length === 0) return null;

  function remove(filter: ActiveFilter) {
    const next = new URLSearchParams(searchParams.toString());
    if (filter.key === "talle" || filter.key === "color") {
      const remaining = next
        .getAll(filter.key)
        .filter((value) => value !== filter.value);
      next.delete(filter.key);
      remaining.forEach((value) => next.append(filter.key, value));
    } else {
      next.delete(filter.key);
    }
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-2">
      {filters.map((filter) => (
        <li key={`${filter.key}-${filter.value}`}>
          <button
            type="button"
            onClick={() => remove(filter)}
            className="inline-flex min-h-11 items-center gap-1 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {filter.label}
            <span aria-hidden="true">×</span>
            <span className="sr-only">Quitar filtro</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
