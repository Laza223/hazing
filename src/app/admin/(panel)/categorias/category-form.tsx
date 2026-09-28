"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

import { TextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { slugify } from "@/lib/admin/slug";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/admin/(panel)/categorias/actions";

export interface CategoryFormValues {
  id?: string;
  name: string;
  slug: string;
  parentId: string | null;
  skuPrefix: string;
  order: number;
  active: boolean;
  image: string | null;
  showInMenu: boolean;
}

export interface ParentOption {
  id: string;
  name: string;
}

interface Props {
  /** Cuando viene, el form edita; si no, crea. */
  initial?: CategoryFormValues;
  /** Categorías raíz disponibles como padre (sin incluir la propia al editar). */
  parents: ParentOption[];
}

const selectClass =
  "h-11 w-full rounded-control border border-line bg-paper px-3 text-base text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:text-sm";

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

export function CategoryForm({ initial, parents }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [parentId, setParentId] = useState<string>(initial?.parentId ?? "");
  const [skuPrefix, setSkuPrefix] = useState(initial?.skuPrefix ?? "");
  const [order, setOrder] = useState(String(initial?.order ?? 0));
  const [active, setActive] = useState(initial?.active ?? true);
  const [showInMenu, setShowInMenu] = useState(initial?.showInMenu ?? true);
  const [image, setImage] = useState(initial?.image ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Slug auto desde el nombre mientras Dana no lo edite a mano.
  const onNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        name,
        slug,
        parentId: parentId || null,
        skuPrefix,
        order,
        active,
        image: image || null,
        showInMenu,
      };
      const r = initial?.id
        ? await updateCategoryAction(initial.id, payload)
        : await createCategoryAction(payload);
      if (r.ok) {
        router.push("/admin/categorias");
        router.refresh();
      } else {
        setError(r.error ?? "No se pudo guardar la categoría.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <FormSection
        title="Datos básicos"
        hint="El nombre y la dirección con la que tus clientas la van a ver."
      >
        <TextInput
          id="cat-name"
          label="Nombre"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ej: Remeras"
          autoFocus
        />
        <div className="space-y-1">
          <TextInput
            id="cat-slug"
            label="Slug (la dirección en la web)"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="remeras"
          />
          <p className="text-xs text-ink-3">
            Se arma solo desde el nombre. Podés cambiarlo.
          </p>
        </div>
      </FormSection>

      <FormSection
        title="Organización"
        hint="Dónde vive la categoría y cómo se ordena en la tienda."
      >
        <div className="space-y-1">
          <Label htmlFor="cat-parent">Categoría padre (opcional)</Label>
          <select
            id="cat-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={selectClass}
          >
            <option value="">Sin padre (categoría principal)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-3">
            Elegí una principal para crear una subcategoría. Solo hay dos
            niveles.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <TextInput
              id="cat-prefix"
              label="Prefijo de SKU"
              value={skuPrefix}
              onChange={(e) =>
                setSkuPrefix(e.target.value.toUpperCase().slice(0, 3))
              }
              placeholder="REM"
              className="font-mono uppercase"
            />
            <p className="text-xs text-ink-3">
              1 a 3 letras. Arma los códigos de producto.
            </p>
          </div>
          <div className="space-y-1">
            <TextInput
              id="cat-order"
              label="Orden"
              value={order}
              onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="0"
              className="tabular-nums"
            />
            <p className="text-xs text-ink-3">Más chico = aparece antes.</p>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Imagen y visibilidad"
        hint="Una foto opcional y si la categoría aparece en la tienda."
      >
        <TextInput
          id="cat-image"
          label="Imagen (ruta, opcional)"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="categorias/remeras.webp"
          className="font-mono text-sm"
        />

        <div className="flex items-center justify-between gap-4 rounded-control border border-line p-3.5">
          <div>
            <Label htmlFor="cat-active">Activa</Label>
            <p className="text-xs text-ink-3">
              Si está apagada, no se muestra en la tienda.
            </p>
          </div>
          <Switch
            id="cat-active"
            checked={active}
            onCheckedChange={setActive}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-control border border-line p-3.5">
          <div>
            <Label htmlFor="cat-show-in-menu">Mostrar en menú</Label>
            <p className="text-xs text-ink-3">
              Si está apagado, la categoría sigue visible en /tienda pero no
              aparece en el menú ni en &ldquo;Comprar por categoría&rdquo; del
              home.
            </p>
          </div>
          <Switch
            id="cat-show-in-menu"
            checked={showInMenu}
            onCheckedChange={setShowInMenu}
          />
        </div>
      </FormSection>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-control border border-line px-3.5 py-3 text-sm text-ink"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {initial?.id ? "Guardar cambios" : "Crear categoría"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/categorias")}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
