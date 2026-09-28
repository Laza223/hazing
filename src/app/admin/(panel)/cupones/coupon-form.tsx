"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { TextInput } from "@/components/ui/text-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import type { CouponFormInput } from "@/lib/admin/coupons/validation";
import { createCouponAction, updateCouponAction } from "./actions";
import type { CouponType, CouponScope } from "@prisma/client";

export interface ScopeOption {
  id: string;
  name: string;
}

interface Props {
  /** Si viene, el form edita ese cupón; si no, crea uno nuevo. */
  couponId?: string;
  initial?: CouponFormInput;
  categories: ScopeOption[];
  products: ScopeOption[];
}

const EMPTY: CouponFormInput = {
  code: "",
  type: "percentage",
  value: "",
  scope: "all",
  scopeId: "",
  minSubtotal: "",
  maxUses: "",
  perCustomerLimit: "",
  validFrom: "",
  validTo: "",
  active: true,
};

export function CouponForm({ couponId, initial, categories, products }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CouponFormInput>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const set = <K extends keyof CouponFormInput>(
    key: K,
    value: CouponFormInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const scopeOptions = form.scope === "category" ? categories : products;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startSaving(async () => {
      const r = couponId
        ? await updateCouponAction(couponId, form)
        : await createCouponAction(form);
      if (r.ok) {
        router.push("/admin/cupones");
        router.refresh();
      } else {
        setError(r.error ?? "No se pudo guardar el cupón.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      {/* El descuento */}
      <section className="space-y-4 rounded-control border border-line bg-paper p-5">
        <h2 className="text-base font-medium text-ink">El descuento</h2>
        <p className="text-xs text-ink-3">
          El código y cuánto ahorra la clienta.
        </p>

        <TextInput
          id="code"
          label="Código"
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          placeholder="Ej: HAZING10"
          autoCapitalize="characters"
          className="font-medium tracking-wide"
        />
        <p className="-mt-2 text-xs text-ink-4">
          Es lo que escribe la clienta al pagar. Solo letras, números y guiones.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="type">Tipo de descuento</Label>
            <Select
              value={form.type}
              onValueChange={(v) => set("type", v as CouponType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                <SelectItem value="free_shipping">Envío gratis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.type !== "free_shipping" ? (
            <TextInput
              id="value"
              label={
                form.type === "percentage"
                  ? "Porcentaje (1 a 100)"
                  : "Monto en $"
              }
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              inputMode="decimal"
              placeholder={form.type === "percentage" ? "10" : "1500"}
            />
          ) : null}
        </div>
      </section>

      {/* A qué se aplica */}
      <section className="space-y-4 rounded-control border border-line bg-paper p-5">
        <h2 className="text-base font-medium text-ink">A qué se aplica</h2>
        <p className="text-xs text-ink-3">
          Podés limitar el descuento a una categoría o a un producto.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="scope">Aplica a</Label>
            <Select
              value={form.scope}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, scope: v as CouponScope, scopeId: "" }))
              }
            >
              <SelectTrigger id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el carrito</SelectItem>
                <SelectItem value="category">Una categoría</SelectItem>
                <SelectItem value="product">Un producto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.scope !== "all" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="scopeId">
                {form.scope === "category" ? "Categoría" : "Producto"}
              </Label>
              <Select
                value={form.scopeId}
                onValueChange={(v) => set("scopeId", v)}
              >
                <SelectTrigger id="scopeId">
                  <SelectValue placeholder="Elegí una opción" />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-ink-4">
                      {form.scope === "category"
                        ? "No hay categorías cargadas todavía."
                        : "No hay productos cargados todavía."}
                    </p>
                  ) : (
                    scopeOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </section>

      {/* Condiciones y límites */}
      <section className="space-y-4 rounded-control border border-line bg-paper p-5">
        <h2 className="text-base font-medium text-ink">
          Condiciones y límites
        </h2>
        <p className="text-xs text-ink-3">
          Todo opcional: dejalos vacíos si no querés poner topes.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput
            id="minSubtotal"
            label="Mínimo de compra ($)"
            value={form.minSubtotal}
            onChange={(e) => set("minSubtotal", e.target.value)}
            inputMode="decimal"
            placeholder="Opcional"
          />
          <TextInput
            id="maxUses"
            label="Máximo de usos"
            value={form.maxUses}
            onChange={(e) => set("maxUses", e.target.value)}
            inputMode="numeric"
            placeholder="Opcional"
          />
          <TextInput
            id="perCustomerLimit"
            label="Usos por clienta"
            value={form.perCustomerLimit}
            onChange={(e) => set("perCustomerLimit", e.target.value)}
            inputMode="numeric"
            placeholder="Opcional"
          />
        </div>
      </section>

      {/* Vigencia */}
      <section className="space-y-4 rounded-control border border-line bg-paper p-5">
        <h2 className="text-base font-medium text-ink">Vigencia</h2>
        <p className="text-xs text-ink-3">
          Desde y hasta cuándo se puede usar. Dejalos vacíos para que no
          caduque.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="validFrom"
            label="Válido desde"
            type="date"
            value={form.validFrom}
            onChange={(e) => set("validFrom", e.target.value)}
          />
          <TextInput
            id="validTo"
            label="Válido hasta"
            type="date"
            value={form.validTo}
            onChange={(e) => set("validTo", e.target.value)}
          />
        </div>
      </section>

      {/* Estado */}
      <section className="space-y-4 rounded-control border border-line bg-paper p-5">
        <h2 className="text-base font-medium text-ink">Estado</h2>
        <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-paper-2 px-4 py-3">
          <Label htmlFor="active" className="cursor-pointer normal-case">
            <span className="block text-sm font-medium text-ink">
              Cupón activo
            </span>
            <span className="mt-0.5 block text-xs font-normal text-ink-3">
              Si lo desactivás, las clientas no pueden usarlo al pagar.
            </span>
          </Label>
          <Switch
            id="active"
            checked={form.active}
            onCheckedChange={(c) => set("active", c)}
          />
        </div>
      </section>

      {error ? (
        <p
          className="flex items-center gap-2 rounded-control border border-line bg-paper-2 px-4 py-3 text-sm text-ink"
          role="alert"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {couponId ? "Guardar cambios" : "Crear cupón"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/cupones")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
