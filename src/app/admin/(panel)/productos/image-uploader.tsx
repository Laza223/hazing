"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { compressImageClient } from "@/lib/images/compress";
import { uploadProductImageAction } from "@/app/admin/(panel)/productos/actions";

interface Props {
  value: string[];
  onChange: (paths: string[]) => void;
  /** Base pública del bucket, ej. https://xxx.supabase.co/storage/v1/object/public/product-images/ */
  publicBase: string;
  max?: number;
  className?: string;
}

/**
 * Subida de fotos del producto (docs/spec/07-admin.md §3.4): varias a la vez (también
 * desde la cámara del celular gracias a `accept="image/*"`), compresión en el navegador
 * antes de subir, portada = primera miniatura, mover con botones ←/→ (sin drag and drop:
 * accesible y funciona igual en touch) y "Quitar".
 */
export function ImageUploader({
  value,
  onChange,
  publicBase,
  max = 8,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const remaining = max - value.length;
    const selected = Array.from(files).slice(0, Math.max(0, remaining));

    startUpload(async () => {
      const next: string[] = [];
      try {
        for (let i = 0; i < selected.length; i++) {
          setProgressMsg(
            `Optimizando y subiendo foto ${i + 1} de ${selected.length}...`,
          );
          const fileToUpload = await compressImageClient(
            selected[i],
            1600,
            0.85,
          );
          const fd = new FormData();
          fd.set("file", fileToUpload);
          const r = await uploadProductImageAction(fd);
          if (r.ok && r.path) {
            next.push(r.path);
          } else {
            setError(r.error ?? "No se pudo subir una de las imágenes.");
            break;
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error inesperado al subir las imágenes.",
        );
      } finally {
        setProgressMsg(null);
        if (inputRef.current) inputRef.current.value = "";
      }
      if (next.length > 0) onChange([...value, ...next]);
    });
  };

  const remove = (path: string) => onChange(value.filter((p) => p !== path));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((path, i) => (
            <div
              key={path}
              className="relative size-24 overflow-hidden border border-line"
            >
              <Image
                src={`${publicBase}${path}`}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
              {i === 0 ? (
                <span className="tracking-caps-sm absolute left-1 top-1 bg-paper/90 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink">
                  Portada
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-paper/90 px-1 py-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Mover imagen a la izquierda"
                  className="grid size-6 place-items-center text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-30"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => remove(path)}
                  aria-label="Quitar imagen"
                  className="grid size-6 place-items-center text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label="Mover imagen a la derecha"
                  className="grid size-6 place-items-center text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-30"
                >
                  <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pick}
          disabled={uploading || value.length >= max}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
          )}
          Agregar fotos
        </Button>
        <p className="text-xs text-ink-3">
          Solo fotos reales de la prenda. Hasta {max} fotos, máx. 5&nbsp;MB cada
          una (se optimizan solas).
        </p>
        {progressMsg && (
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {progressMsg}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm text-ink"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {value.length >= max && (
          <p className="text-xs text-ink-4">
            Llegaste al máximo de {max} fotos.
          </p>
        )}
      </div>
    </div>
  );
}
