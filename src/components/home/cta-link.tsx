import Link from "next/link";

import { cn } from "@/lib/utils";

/** Link de texto de la home: mayúsculas 12px con subrayado de 1px en `ink`. */
export function CtaLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "tracking-caps-sm inline-flex min-h-11 items-center border-b border-ink text-xs font-medium uppercase text-ink outline-none transition-opacity duration-ui ease-ui hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
