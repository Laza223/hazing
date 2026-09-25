import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Wrapper tipográfico para páginas de texto (legales/institucionales).
 *  Headings jerárquicos, ancho de lectura y tokens de dirección de arte
 *  (ink, sin color no-neutral, foco visible con outline). */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "mx-auto max-w-prose px-4 py-10 text-ink md:px-0",
        "[&_h1]:font-display [&_h1]:text-2xl [&_h1]:text-ink",
        "[&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-ink",
        "[&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-ink-2",
        "[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-ink-2",
        "[&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2",
        "[&_strong]:font-medium [&_strong]:text-ink",
        className,
      )}
    >
      {children}
    </article>
  );
}
