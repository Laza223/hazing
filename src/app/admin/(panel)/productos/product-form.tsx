"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import type { SizeSystem } from "@prisma/client";

import { TextInput } from "@/components/ui/text-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { ProductFormInput } from "@/lib/admin/products/validation";
import { VariantFields } from "@/app/admin/(panel)/productos/variant-fields";
import { ImageUploader } from "@/app/admin/(panel)/productos/image-uploader";
import {
  createProductAction,
  updateProductAction,
} from "@/app/admin/(panel)/productos/actions";

export interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  categories: CategoryOption[];
  publicBase: string;
  productId?: string;
  initial?: ProductFormInput;
}

function blank(): ProductFormInput {
  return {
    name: "",
    slug: "",
    description: null,
    categoryId: "",
    extraCategoryIds: [],
    sizeSystem: "letters",
    basePrice: "",
    compareAtPrice: null,
    cost: "",
    images: [],
    isFeatured: false,
    heroRank: null,
    tags: [],
    seoTitle: null,
    seoDescription: null,
    active: true,
    variants: [],
  };
}

function numOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const SIZE_SYSTEM_LABEL: Record<SizeSystem, string> = {
  letters: "Letras (XS a XXL)",
  numeric: "Números (34 a 50)",
  one_size: "Talle único",
};

/** Sección del form: título + ayuda corta en voseo, borde `line` fino (docs/spec/07-admin.md §3.1). */
function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-control border border-line p-6">
      <div>
        <h2 className="text-base font-medium text-ink">{title}</h2>
        {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProductForm({
  categories,
  publicBase,
  productId,
  initial,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormInput>(initial ?? blank());
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProductFormInput>(
    key: K,
    value: ProductFormInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  // Cambiar el sistema de talles con variantes cargadas pide confirmación (docs/spec/07-admin.md
  // §3.5): los talles del sistema anterior no aplican al nuevo, así que limpiamos la grilla.
  const changeSizeSystem = (next: SizeSystem) => {
    if (next === form.sizeSystem) return;
    if (form.variants.length > 0) {
      const ok = window.confirm(
        "Cambiar el sistema de talles borra las variantes ya cargadas (sus talles no existen en el sistema nuevo). ¿Confirmás el cambio?",
      );
      if (!ok) return;
    }
    setForm((f) => ({ ...f, sizeSystem: next, variants: [] }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: ProductFormInput = {
      ...form,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== ""),
    };
    startSubmit(async () => {
      const r = productId
        ? await updateProductAction(productId, payload)
        : await createProductAction(payload);
      if (r.ok) router.push("/admin/productos");
      else setError(r.error ?? "No se pudo guardar el producto.");
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <FormSection
        title="Fotos"
        hint="Solo fotos reales de la prenda. La primera foto es la portada del producto."
      >
        <ImageUploader
          value={form.images}
          onChange={(paths) => set("images", paths)}
          publicBase={publicBase}
        />
      </FormSection>

      <FormSection title="Nombre y precio">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="name"
            label="Nombre"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Vestido Lino Oversize"
          />
          <TextInput
            id="slug"
            label="Enlace (slug)"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="Se genera solo si lo dejás vacío"
          />
          <TextInput
            id="basePrice"
            label="Precio (ARS)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.basePrice}
            onChange={(e) =>
              set(
                "basePrice",
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            placeholder="Ej: 45000"
          />
          <TextInput
            id="cost"
            label="Costo (ARS)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.cost}
            onChange={(e) =>
              set("cost", e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Ej: 18000"
          />
        </div>
        <div className="flex items-center gap-3 rounded-control border border-line px-4 py-3">
          <Switch
            id="active"
            checked={form.active}
            onCheckedChange={(checked) => set("active", checked)}
          />
          <Label htmlFor="active" className="cursor-pointer">
            Producto activo (visible en la tienda)
          </Label>
        </div>
      </FormSection>

      <FormSection
        title="Categoría"
        hint="Define el prefijo del código (SKU) de cada variante."
      >
        <div className="space-y-1">
          <Label htmlFor="category">Categoría</Label>
          <Select
            value={form.categoryId}
            onValueChange={(v) => {
              set("categoryId", v);
              if (form.extraCategoryIds.includes(v)) {
                set(
                  "extraCategoryIds",
                  form.extraCategoryIds.filter((id) => id !== v),
                );
              }
            }}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Elegí una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormSection>

      <FormSection
        title="Talles y colores"
        hint="Elegí el sistema de talle, tildá los talles y agregá los colores: generamos una fila por combinación."
      >
        <div className="space-y-1">
          <Label htmlFor="sizeSystem">Sistema de talles</Label>
          <Select
            value={form.sizeSystem}
            onValueChange={(v) => changeSizeSystem(v as SizeSystem)}
          >
            <SelectTrigger id="sizeSystem">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SIZE_SYSTEM_LABEL) as SizeSystem[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SIZE_SYSTEM_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <VariantFields
          key={form.sizeSystem}
          sizeSystem={form.sizeSystem}
          variants={form.variants}
          onChange={(variants) => set("variants", variants)}
        />
      </FormSection>

      <FormSection title="Descripción">
        <Textarea
          value={form.description ?? ""}
          onChange={(e) =>
            set("description", e.target.value === "" ? null : e.target.value)
          }
          placeholder="Contale a la clienta de qué se trata: tela, calce, cuidados."
          rows={4}
          aria-label="Descripción del producto"
        />
      </FormSection>

      <details className="rounded-control border border-line">
        <summary className="cursor-pointer select-none rounded-control px-5 py-3 text-sm font-medium text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          Más opciones
        </summary>
        <div className="space-y-5 border-t border-line p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <TextInput
                id="compareAtPrice"
                label="Precio anterior (oferta, opcional)"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.compareAtPrice ?? ""}
                onChange={(e) =>
                  set("compareAtPrice", numOrNull(e.target.value))
                }
                placeholder="Ej: 55000"
              />
              <p className="text-[11px] text-ink-4">
                El precio anterior aparece tachado; dejalo vacío si no está en
                oferta.
              </p>
            </div>
            <TextInput
              id="heroRank"
              label="Orden en portada (opcional)"
              type="number"
              inputMode="numeric"
              min={1}
              value={form.heroRank ?? ""}
              onChange={(e) => set("heroRank", numOrNull(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-3 rounded-control border border-line px-4 py-3">
            <Switch
              id="isFeatured"
              checked={form.isFeatured}
              onCheckedChange={(checked) => set("isFeatured", checked)}
            />
            <Label htmlFor="isFeatured" className="cursor-pointer">
              Destacar en portada
            </Label>
          </div>

          <TextInput
            id="tags"
            label="Etiquetas (separadas por coma)"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="lino, verano, oversize"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              id="seoTitle"
              label="Título SEO (opcional)"
              value={form.seoTitle ?? ""}
              onChange={(e) =>
                set("seoTitle", e.target.value === "" ? null : e.target.value)
              }
            />
            <TextInput
              id="seoDescription"
              label="Descripción SEO (opcional)"
              value={form.seoDescription ?? ""}
              onChange={(e) =>
                set(
                  "seoDescription",
                  e.target.value === "" ? null : e.target.value,
                )
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Categorías adicionales (opcional)</Label>
            <div className="grid gap-2 rounded-control border border-line p-3 sm:grid-cols-2">
              {categories
                .filter((c) => c.id !== form.categoryId)
                .map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                  >
                    <Checkbox
                      checked={form.extraCategoryIds.includes(c.id)}
                      onChange={(e) =>
                        set(
                          "extraCategoryIds",
                          e.target.checked
                            ? [...form.extraCategoryIds, c.id]
                            : form.extraCategoryIds.filter((id) => id !== c.id),
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
            </div>
            <p className="text-xs text-ink-3">
              El producto va a aparecer también en estas categorías, además de
              la principal.
            </p>
          </div>
        </div>
      </details>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-control border border-line px-4 py-3 text-sm text-ink"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {productId ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/productos")}
          disabled={submitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
