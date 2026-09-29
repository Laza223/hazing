import { Wordmark } from "@/components/brand/wordmark";

/**
 * Lo que se ve en el lugar de una foto de producto que todavía no se cargó:
 * el wordmark en `line` sobre `paper-2`, sin texto técnico. Lo ve la clienta
 * (catálogo, PDP, home), así que no puede decir "pendiente" ni dar medidas.
 */
export function ImagePlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-paper-2"
    >
      <Wordmark className="h-5 w-auto text-line" />
    </div>
  );
}
