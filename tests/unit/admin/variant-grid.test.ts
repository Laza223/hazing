import { describe, it, expect } from "vitest";
import { rebuildVariantGrid } from "@/lib/admin/products/variant-grid";
import type { VariantFormInput } from "@/lib/admin/products/validation";

const inactiveVariant: VariantFormInput = {
  id: "v1",
  size: "M",
  color: "Rojo",
  swatchHex: null,
  sku: "REM-0007",
  stock: 3,
  lowStockThreshold: 3,
  priceOverride: null,
  image: null,
  active: false, // desactivada con el switch "Activa" — nunca destildada del grid
  order: 0,
};

describe("rebuildVariantGrid", () => {
  it("una fila existente e inactiva, con ambos ejes tildados, se preserva con su id/SKU/active real", () => {
    const next = rebuildVariantGrid(
      ["M"],
      [{ name: "Rojo", swatchHex: null }],
      [inactiveVariant],
    );
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      id: "v1",
      sku: "REM-0007",
      active: false,
      stock: 3,
    });
  });

  it("una combinación que Dana recién tildó (no estaba en `current`) entra siempre con active:true", () => {
    // `current` no tiene ninguna fila M::Rojo — es una combinación nueva para el form,
    // sea porque nunca existió o porque hay una fila desactivada en DB para otra combinación.
    const next = rebuildVariantGrid(
      ["M"],
      [{ name: "Rojo", swatchHex: null }],
      [],
    );
    expect(next).toHaveLength(1);
    expect(next[0].id).toBeUndefined();
    expect(next[0]).toMatchObject({ sku: "", active: true });
  });

  it("destildar un talle saca del grid las filas de ese talle, activas o no", () => {
    const next = rebuildVariantGrid(
      [], // M ya no está tildado
      [{ name: "Rojo", swatchHex: null }],
      [inactiveVariant],
    );
    expect(next).toHaveLength(0);
  });

  it("no duplica ni pierde una fila activa cuando se agrega un color nuevo", () => {
    const active: VariantFormInput = {
      ...inactiveVariant,
      id: "v2",
      color: "Negro",
      active: true,
    };
    const next = rebuildVariantGrid(
      ["M"],
      [
        { name: "Negro", swatchHex: null },
        { name: "Rojo", swatchHex: null },
      ],
      [active],
    );
    expect(next).toHaveLength(2);
    const negro = next.find((v) => v.color === "Negro");
    expect(negro).toMatchObject({ id: "v2", active: true });
    const rojo = next.find((v) => v.color === "Rojo");
    expect(rojo?.id).toBeUndefined();
    expect(rojo).toMatchObject({ active: true });
  });
});
