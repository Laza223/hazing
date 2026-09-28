"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { RatingInput } from "@/components/ui/rating-stars";
import { createReviewAction } from "./review-actions";

export function ReviewForm({
  productId,
  slug,
  isLoggedIn,
}: {
  productId: string;
  slug: string;
  isLoggedIn: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneStatus, setDoneStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await createReviewAction(fd);
    setPending(false);
    if (res.ok) setDoneStatus(res.status ?? "pending");
    else setError(res.error ?? "Ocurrió un error al enviar la reseña.");
  }

  if (doneStatus) {
    return (
      <p className="border border-line p-4 text-sm text-ink">
        {doneStatus === "approved"
          ? "¡Gracias por tu reseña! Ya está publicada."
          : "¡Gracias por tu reseña! Se publica en breve, tras la moderación."}
      </p>
    );
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        Escribir reseña
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-line p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">
          Tu opinión sobre esta prenda
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-ink-3 outline-none hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Cancelar
        </button>
      </div>

      <RatingInput name="rating" />

      {!isLoggedIn && (
        <TextInput
          id="rname"
          name="authorName"
          label="Tu nombre"
          required
          minLength={2}
          maxLength={60}
          autoComplete="name"
        />
      )}

      <TextInput
        id="rtitle"
        name="title"
        label="Título (opcional)"
        maxLength={120}
      />

      <div className="flex flex-col gap-1">
        <label
          htmlFor="rbody"
          className="tracking-caps-sm text-xs font-medium uppercase text-ink-2"
        >
          Tu experiencia
        </label>
        <textarea
          id="rbody"
          name="body"
          required
          maxLength={2000}
          rows={3}
          className="rounded-control border border-line bg-paper px-3 py-2 text-base text-ink outline-none transition-colors duration-ui ease-ui placeholder:text-ink-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </div>

      {/* Honeypot anti-spam */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {!isLoggedIn && (
        <p className="text-xs text-ink-3">
          Tu reseña se publica tras la moderación de la dueña.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-ink">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Publicar reseña"}
      </Button>
    </form>
  );
}
