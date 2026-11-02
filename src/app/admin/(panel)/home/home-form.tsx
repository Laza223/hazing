"use client";

import { useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { compressImageClient } from "@/lib/images/compress";
import { productImageUrl } from "@/lib/images";
import {
  DEFAULT_HOME_CONTENT,
  type HomeContentData,
  type HomeLook,
  type HomeSectionKey,
} from "@/lib/home/content";
import { LOOKBOOK_MAX, LOOKBOOK_MIN } from "@/lib/admin/home/validation";
import { saveHomeContentAction, uploadHomeImageAction } from "./actions";

interface Props {
  initial: HomeContentData;
}

/** Foto única de un slot: vista previa, "Cambiar foto" y la proporción esperada. */
function ImageField({
  label,
  hint,
  aspect,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  /** Clase de aspect-ratio de Tailwind, p. ej. `aspect-[3/2]`. */
  aspect: string;
  value: string;
  onChange: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const url = productImageUrl(value);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    startUpload(async () => {
      try {
        const compressed = await compressImageClient(file, 2400, 0.85);
        const fd = new FormData();
        fd.set("file", compressed);
        const r = await uploadHomeImageAction(fd);
        if (r.ok && r.path) onChange(r.path);
        else setError(r.error ?? "No se pudo subir la imagen.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al subir la imagen.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div
        className={`relative w-full max-w-xs overflow-hidden border border-line bg-line-2 ${aspect}`}
      >
        {url && (
          <Image
            src={url}
            alt=""
            fill
            sizes="320px"
            className="object-cover"
            unoptimized={!value.startsWith("/images/")}
          />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/70">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </div>
        )}
      </div>
      <p className="text-xs text-ink-3">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="mr-2 size-4" aria-hidden />
        Cambiar foto
      </Button>
      {error && (
        <p role="alert" className="flex items-center gap-2 text-xs text-ink">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  onReset,
  children,
}: {
  title: string;
  description: string;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-control border border-line p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-ink">{title}</h2>
          <p className="text-xs text-ink-3">{description}</p>
        </div>
        <Button type="button" variant="text" size="sm" onClick={onReset}>
          <RotateCcw className="mr-2 size-4" aria-hidden />
          Restaurar original
        </Button>
      </div>
      {children}
    </section>
  );
}

function AreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

export function HomeForm({ initial }: Props) {
  const [c, setC] = useState<HomeContentData>(initial);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends HomeSectionKey>(
    key: K,
    patch: Partial<HomeContentData[K]>,
  ) => setC((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const reset = (key: HomeSectionKey) =>
    setC((prev) => ({
      ...prev,
      [key]: structuredClone(DEFAULT_HOME_CONTENT[key]),
    }));

  const text = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder?: string,
  ) => (
    <TextInput
      id={id}
      label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  const looks = c.lookbook.looks;
  const setLooks = (next: HomeLook[]) => set("lookbook", { looks: next });
  const moveLook = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= looks.length) return;
    const next = [...looks];
    [next[i], next[j]] = [next[j], next[i]];
    setLooks(next);
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    startTransition(async () => {
      const res = await saveHomeContentAction(c);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-control border border-line px-4 py-3 text-sm text-ink"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Home guardada. Ya se ve en la tienda.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-control border border-line px-4 py-3 text-sm text-ink"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Section
        title="Portada"
        description="Lo primero que se ve al entrar: foto grande, frase y botón."
        onReset={() => reset("hero")}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {text("hero-eyebrow", "Línea chica", c.hero.eyebrow, (v) =>
            set("hero", { eyebrow: v }),
          )}
          {text("hero-statement", "Frase principal", c.hero.statement, (v) =>
            set("hero", { statement: v }),
          )}
          {text("hero-cta", "Texto del botón", c.hero.ctaLabel, (v) =>
            set("hero", { ctaLabel: v }),
          )}
          {text(
            "hero-href",
            "Link del botón",
            c.hero.ctaHref,
            (v) => set("hero", { ctaHref: v }),
            "/tienda",
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ImageField
            label="Foto en compu"
            hint="Horizontal 3:2 (ej. 2880×1920). La modelo a la izquierda: el texto va sobre la derecha."
            aspect="aspect-[3/2]"
            value={c.hero.imageDesktop}
            onChange={(p) => set("hero", { imageDesktop: p })}
          />
          <ImageField
            label="Foto en celular"
            hint="Vertical 4:5 (ej. 1600×2000)."
            aspect="aspect-[4/5]"
            value={c.hero.imageMobile}
            onChange={(p) => set("hero", { imageMobile: p })}
          />
        </div>
      </Section>

      <Section
        title="Nuevo"
        description="Los últimos productos cargados aparecen solos. Acá solo se editan el título y el link."
        onReset={() => reset("newIn")}
      >
        <div className="grid gap-5 md:grid-cols-3">
          {text("new-title", "Título", c.newIn.title, (v) =>
            set("newIn", { title: v }),
          )}
          {text("new-label", "Texto del link", c.newIn.linkLabel, (v) =>
            set("newIn", { linkLabel: v }),
          )}
          {text("new-href", "Link", c.newIn.linkHref, (v) =>
            set("newIn", { linkHref: v }),
          )}
        </div>
      </Section>

      <Section
        title="La marca"
        description="Foto a un lado y un texto corto sobre Hazing."
        onReset={() => reset("story")}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {text("story-eyebrow", "Línea chica", c.story.eyebrow, (v) =>
            set("story", { eyebrow: v }),
          )}
          {text("story-title", "Título", c.story.title, (v) =>
            set("story", { title: v }),
          )}
          <div className="md:col-span-2">
            <AreaField
              label="Texto"
              value={c.story.body}
              onChange={(v) => set("story", { body: v })}
            />
          </div>
          {text("story-label", "Texto del link", c.story.linkLabel, (v) =>
            set("story", { linkLabel: v }),
          )}
          {text("story-href", "Link", c.story.href, (v) =>
            set("story", { href: v }),
          )}
          {text(
            "story-alt",
            "Descripción de la foto (para accesibilidad)",
            c.story.alt,
            (v) => set("story", { alt: v }),
          )}
        </div>
        <ImageField
          label="Foto"
          hint="Horizontal 3:2."
          aspect="aspect-[3/2]"
          value={c.story.image}
          onChange={(p) => set("story", { image: p })}
        />
      </Section>

      <Section
        title="Lookbook"
        description={`Fotos que se recorren en horizontal. Entre ${LOOKBOOK_MIN} y ${LOOKBOOK_MAX} looks, todas verticales 3:4. El primero es el de más a la izquierda.`}
        onReset={() => reset("lookbook")}
      >
        <ol className="space-y-6">
          {looks.map((look, i) => (
            <li
              key={`${look.image}-${i}`}
              className="grid gap-4 border-t border-line pt-5 md:grid-cols-[10rem_1fr]"
            >
              <ImageField
                label={`Look ${String(i + 1).padStart(2, "0")}`}
                hint="Vertical 3:4."
                aspect="aspect-[3/4]"
                value={look.image}
                onChange={(p) =>
                  setLooks(
                    looks.map((l, k) => (k === i ? { ...l, image: p } : l)),
                  )
                }
              />
              <div className="space-y-4">
                {text(`look-name-${i}`, "Nombre de la prenda", look.name, (v) =>
                  setLooks(
                    looks.map((l, k) => (k === i ? { ...l, name: v } : l)),
                  ),
                )}
                {text(
                  `look-alt-${i}`,
                  "Descripción de la foto (para accesibilidad)",
                  look.alt,
                  (v) =>
                    setLooks(
                      looks.map((l, k) => (k === i ? { ...l, alt: v } : l)),
                    ),
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={i === 0}
                    onClick={() => moveLook(i, -1)}
                    aria-label={`Mover el look ${i + 1} hacia la izquierda`}
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={i === looks.length - 1}
                    onClick={() => moveLook(i, 1)}
                    aria-label={`Mover el look ${i + 1} hacia la derecha`}
                  >
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="text"
                    size="sm"
                    disabled={looks.length <= LOOKBOOK_MIN}
                    onClick={() => setLooks(looks.filter((_, k) => k !== i))}
                  >
                    <X className="mr-2 size-4" aria-hidden />
                    Quitar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={looks.length >= LOOKBOOK_MAX}
          onClick={() =>
            setLooks([
              ...looks,
              {
                image: looks[looks.length - 1]?.image ?? "",
                name: "Nuevo look",
                alt: "Nuevo look",
              },
            ])
          }
        >
          <Plus className="mr-2 size-4" aria-hidden />
          Agregar look
        </Button>
        <p className="text-xs text-ink-3">
          El look nuevo arranca con la foto del anterior: cambiala con
          &quot;Cambiar foto&quot;.
        </p>
      </Section>

      <Section
        title="Editorial"
        description="Dos fotos verticales con un texto al costado."
        onReset={() => reset("editorial")}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {text("ed-eyebrow", "Línea chica", c.editorial.eyebrow, (v) =>
            set("editorial", { eyebrow: v }),
          )}
          {text("ed-title", "Título", c.editorial.title, (v) =>
            set("editorial", { title: v }),
          )}
          <div className="md:col-span-2">
            <AreaField
              label="Texto"
              value={c.editorial.body}
              onChange={(v) => set("editorial", { body: v })}
            />
          </div>
          {text("ed-label", "Texto del link", c.editorial.linkLabel, (v) =>
            set("editorial", { linkLabel: v }),
          )}
          {text("ed-href", "Link", c.editorial.href, (v) =>
            set("editorial", { href: v }),
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {([0, 1] as const).map((n) => (
            <div key={n} className="space-y-4">
              <ImageField
                label={n === 0 ? "Foto principal" : "Foto secundaria"}
                hint="Vertical 3:4."
                aspect="aspect-[3/4]"
                value={c.editorial.images[n].image}
                onChange={(p) => {
                  const images = [
                    ...c.editorial.images,
                  ] as typeof c.editorial.images;
                  images[n] = { ...images[n], image: p };
                  set("editorial", { images });
                }}
              />
              {text(
                `ed-alt-${n}`,
                "Descripción de la foto (para accesibilidad)",
                c.editorial.images[n].alt,
                (v) => {
                  const images = [
                    ...c.editorial.images,
                  ] as typeof c.editorial.images;
                  images[n] = { ...images[n], alt: v };
                  set("editorial", { images });
                },
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Banda de cierre"
        description="Foto ancha al final de la home, con un botón."
        onReset={() => reset("campaignBand")}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {text("band-eyebrow", "Línea chica", c.campaignBand.eyebrow, (v) =>
            set("campaignBand", { eyebrow: v }),
          )}
          {text("band-title", "Título", c.campaignBand.title, (v) =>
            set("campaignBand", { title: v }),
          )}
          {text(
            "band-label",
            "Texto del botón",
            c.campaignBand.linkLabel,
            (v) => set("campaignBand", { linkLabel: v }),
          )}
          {text("band-href", "Link del botón", c.campaignBand.href, (v) =>
            set("campaignBand", { href: v }),
          )}
          {text(
            "band-alt",
            "Descripción de la foto (para accesibilidad)",
            c.campaignBand.alt,
            (v) => set("campaignBand", { alt: v }),
          )}
        </div>
        <ImageField
          label="Foto"
          hint="Horizontal 3:2. En celular se recorta al centro (4:5)."
          aspect="aspect-[3/2]"
          value={c.campaignBand.image}
          onChange={(p) => set("campaignBand", { image: p })}
        />
      </Section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending && (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
          )}
          Guardar y publicar
        </Button>
        <p className="text-xs text-ink-3">
          &quot;Restaurar original&quot; vuelve la sección a como venía; recién
          se aplica al guardar.
        </p>
      </div>
    </form>
  );
}
