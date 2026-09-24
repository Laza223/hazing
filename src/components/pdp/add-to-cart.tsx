"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SizeSystem } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { PriceLine } from "@/components/catalog/price-line";
import { StockLine } from "@/components/catalog/stock-line";
import type { SizeOption } from "@/components/catalog/size-selector";
import type { ColorOption } from "@/components/catalog/swatch";
import { VariantSelector } from "@/components/pdp/variant-selector";
import { MobileStickyBuyBar } from "@/components/pdp/mobile-sticky-buy-bar";
import { useCartUI } from "@/components/cart/cart-provider";
import { addToCartAction } from "@/app/(storefront)/actions";
import { sortSizes } from "@/lib/catalog/sizes";

/**
 * Variante ya resuelta a valores planos (número, no `Decimal`) para poder
 * cruzar el límite server → client component. `price` es el precio efectivo
 * de ESA variante (`priceOverride ?? basePrice`, ver
 * `src/lib/catalog/pricing.ts`), calculado en el server.
 */
export interface PdpVariant {
  id: string;
  size: string;
  color: string;
  swatchHex: string | null;
  stock: number;
  lowStockThreshold: number;
  price: number;
}

export interface AddToCartProps {
  productName: string;
  variants: PdpVariant[];
  sizeSystem: SizeSystem;
  /** Precio de lista tachado — solo si el producto está en oferta (nivel producto, no por variante). */
  compareAtPrice?: number;
}

const MAIN_CTA_ID = "main-pdp-cta";

/**
 * AddToCart — selector de variante de dos ejes + "Agregar al carrito"
 * (docs/spec/05-direccion-arte.md §7, docs/spec/06-storefront.md §3.5-3.6).
 * Dueño del estado de selección: computa colores/talles disponibles, resuelve
 * la variante elegida y decide qué falta para poder agregar. El botón queda
 * deshabilitado hasta elegir una variante válida, con el motivo como texto
 * (nunca solo un ícono ni un estado de color).
 */
export function AddToCart({
  productName,
  variants,
  sizeSystem,
  compareAtPrice,
}: AddToCartProps) {
  const router = useRouter();
  const { openCart } = useCartUI();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const colors: ColorOption[] = useMemo(() => {
    const seen = new Map<string, ColorOption>();
    for (const v of variants) {
      if (!seen.has(v.color))
        seen.set(v.color, { value: v.color, hex: v.swatchHex });
    }
    return [...seen.values()];
  }, [variants]);

  const showColor = colors.length > 1;
  const showSize = sizeSystem !== "one_size";

  const [selectedColor, setSelectedColor] = useState<string | null>(
    showColor ? null : (colors[0]?.value ?? null),
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    showSize ? null : (variants[0]?.size ?? null),
  );

  const sizeOptions: SizeOption[] = useMemo(() => {
    const relevant = selectedColor
      ? variants.filter((v) => v.color === selectedColor)
      : variants;
    const values = sortSizes(sizeSystem, [
      ...new Set(relevant.map((v) => v.size)),
    ]);
    return values.map((size) => {
      // `some`, no `find`: sin color elegido, `relevant` mezcla variantes de
      // TODOS los colores — un talle solo va "Agotado" si NINGUNA variante
      // (de ningún color, en ese scope) tiene stock. `find` se quedaba con la
      // primera variante que matcheaba el talle e ignoraba que otro color
      // para ese mismo talle sí tuviera stock.
      const available = relevant.some((v) => v.size === size && v.stock > 0);
      return { value: size, available };
    });
  }, [variants, selectedColor, sizeSystem]);

  const selectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return (
      variants.find(
        (v) => v.color === selectedColor && v.size === selectedSize,
      ) ?? null
    );
  }, [variants, selectedColor, selectedSize]);

  const missing = !selectedColor
    ? "Elegí un color."
    : !selectedSize
      ? "Elegí un talle."
      : !selectedVariant || selectedVariant.stock <= 0
        ? "Sin stock disponible."
        : null;

  const displayPrice = selectedVariant?.price ?? variants[0]?.price ?? 0;

  // `trigger` se captura al click: cuando la acción termina, el botón viene de
  // estar `disabled` (pending) y ya no tiene el foco (ver `openCart`).
  const add = (trigger?: HTMLElement | null) => {
    if (!selectedVariant) return;
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction({
        variantId: selectedVariant.id,
        qty: 1,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo agregar al carrito.");
        return;
      }
      if (res.notice) setError(res.notice);
      router.refresh();
      openCart(trigger);
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <PriceLine price={displayPrice} compareAtPrice={compareAtPrice} />

      <VariantSelector
        colors={colors}
        showColor={showColor}
        selectedColor={selectedColor}
        onColorChange={(v) => {
          setSelectedColor(v);
          setError(null);
        }}
        sizes={sizeOptions}
        showSize={showSize}
        selectedSize={selectedSize}
        onSizeChange={(v) => {
          setSelectedSize(v);
          setError(null);
        }}
      />

      <StockLine
        stock={selectedVariant?.stock ?? null}
        lowStockThreshold={selectedVariant?.lowStockThreshold}
      />

      <div className="space-y-2">
        <Button
          id={MAIN_CTA_ID}
          type="button"
          onClick={(event) => add(event.currentTarget)}
          disabled={Boolean(missing) || pending}
          className="w-full"
        >
          {missing ?? "Agregar al carrito"}
        </Button>
        {error && <p className="text-sm text-ink-3">{error}</p>}
      </div>

      <MobileStickyBuyBar
        productName={productName}
        price={displayPrice}
        compareAtPrice={compareAtPrice}
        sizeLabel={selectedSize}
        disabled={Boolean(missing)}
        pending={pending}
        onAdd={add}
        watchTargetId={MAIN_CTA_ID}
      />
    </div>
  );
}
